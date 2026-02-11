from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
import math

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
SECRET_KEY = "left2right_secret_key_change_in_production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 10080  # 7 days

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:8081",
        "http://localhost:8082",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://127.0.0.1:8081",
        "http://127.0.0.1:3000",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Server is running"}

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    import traceback
    print(f"ERROR: {str(exc)}")
    print(traceback.format_exc())
    return JSONResponse(
        status_code=500,
        content={"message": "Internal Server Error", "detail": str(exc)},
    )

from fastapi.responses import JSONResponse

api_router = APIRouter(prefix="/api")

# ============= MODELS =============

class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    userType: str  # donor, receiver, volunteer, admin
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    userType: str
    phone: Optional[str] = None
    createdAt: datetime

class TokenResponse(BaseModel):
    token: str
    user: UserResponse

class Location(BaseModel):
    latitude: float
    longitude: float
    address: Optional[str] = None

class DonationCreate(BaseModel):
    foodType: str
    quantity: int
    description: Optional[str] = None
    expiryDate: datetime
    location: Location
    image: Optional[str] = None  # base64

class Donation(BaseModel):
    id: str
    donorId: str
    donorName: str
    foodType: str
    quantity: int
    description: Optional[str] = None
    expiryDate: datetime
    location: Location
    image: Optional[str] = None
    status: str  # available, claimed, pickedup, delivered, expired
    createdAt: datetime
    volunteerId: Optional[str] = None
    receiverId: Optional[str] = None

class FoodRequestCreate(BaseModel):
    foodType: str
    quantity: int
    urgency: str  # low, medium, high
    location: Location
    notes: Optional[str] = None

class FoodRequest(BaseModel):
    id: str
    receiverId: str
    receiverName: str
    foodType: str
    quantity: int
    urgency: str
    location: Location
    notes: Optional[str] = None
    status: str  # pending, matched, fulfilled, cancelled
    createdAt: datetime
    matchedDonationId: Optional[str] = None

class QualityCheck(BaseModel):
    donationId: str
    expiryStatus: str  # good, near_expiry, expired
    packagingStatus: str  # good, damaged
    smellStatus: str  # fresh, acceptable, bad
    overallQuality: str  # pass, fail
    notes: Optional[str] = None

class FeedbackCreate(BaseModel):
    donationId: str
    rating: int  # 1-5
    comment: Optional[str] = None
    feedbackType: str  # donor_to_volunteer, receiver_to_volunteer, receiver_to_donor

class Feedback(BaseModel):
    id: str
    donationId: str
    fromUserId: str
    toUserId: str
    rating: int
    comment: Optional[str] = None
    feedbackType: str
    createdAt: datetime

# ============= AUTH UTILITIES =============

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    user = await db.users.find_one({"id": user_id})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# ============= HELPER FUNCTIONS =============

def calculate_distance(lat1, lon1, lat2, lon2):
    """Calculate distance between two coordinates in km"""
    R = 6371  # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2) * math.sin(dlat/2) + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2) * math.sin(dlon/2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

# ============= AUTH ROUTES =============

@api_router.post("/register", response_model=TokenResponse)
async def register(user_data: UserRegister):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    import uuid
    user_id = str(uuid.uuid4())
    user_dict = {
        "id": user_id,
        "name": user_data.name,
        "email": user_data.email,
        "password": get_password_hash(user_data.password),
        "userType": user_data.userType,
        "phone": user_data.phone,
        "createdAt": datetime.utcnow(),
        "rating": 5.0,
        "totalDeliveries": 0
    }
    
    await db.users.insert_one(user_dict)
    
    # Create token
    access_token = create_access_token(data={"sub": user_id})
    
    return {
        "token": access_token,
        "user": {
            "id": user_id,
            "name": user_data.name,
            "email": user_data.email,
            "userType": user_data.userType,
            "phone": user_data.phone,
            "createdAt": user_dict["createdAt"]
        }
    }

@api_router.post("/login", response_model=TokenResponse)
async def login(user_data: UserLogin):
    user = await db.users.find_one({"email": user_data.email})
    if not user or not verify_password(user_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    access_token = create_access_token(data={"sub": user["id"]})
    
    return {
        "token": access_token,
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "userType": user["userType"],
            "phone": user.get("phone"),
            "createdAt": user["createdAt"]
        }
    }

@api_router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user["id"],
        "name": current_user["name"],
        "email": current_user["email"],
        "userType": current_user["userType"],
        "phone": current_user.get("phone"),
        "createdAt": current_user["createdAt"]
    }

# ============= DONATION ROUTES =============

@api_router.post("/donations", response_model=Donation)
async def create_donation(donation: DonationCreate, current_user: dict = Depends(get_current_user)):
    if current_user["userType"] != "donor":
        raise HTTPException(status_code=403, detail="Only donors can create donations")
    
    import uuid
    donation_id = str(uuid.uuid4())
    donation_dict = {
        "id": donation_id,
        "donorId": current_user["id"],
        "donorName": current_user["name"],
        "foodType": donation.foodType,
        "quantity": donation.quantity,
        "description": donation.description,
        "expiryDate": donation.expiryDate,
        "location": donation.location.dict(),
        "image": donation.image,
        "status": "available",
        "createdAt": datetime.utcnow(),
        "volunteerId": None,
        "receiverId": None
    }
    
    await db.donations.insert_one(donation_dict)
    return donation_dict

@api_router.get("/donations", response_model=List[Donation])
async def get_donations(status: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    
    # Filter based on user type
    if current_user["userType"] == "donor":
        query["donorId"] = current_user["id"]
    elif current_user["userType"] == "volunteer":
        # Show available or assigned to this volunteer
        if status:
            query["status"] = status
    
    if status and current_user["userType"] != "donor":
        query["status"] = status
    
    donations = await db.donations.find(query).sort("createdAt", -1).to_list(100)
    return donations

@api_router.get("/donations/available", response_model=List[Donation])
async def get_available_donations(latitude: Optional[float] = None, longitude: Optional[float] = None, current_user: dict = Depends(get_current_user)):
    """Get available donations sorted by proximity"""
    donations = await db.donations.find({"status": "available"}).to_list(100)
    
    if latitude and longitude:
        # Calculate distance and sort
        for donation in donations:
            distance = calculate_distance(
                latitude, longitude,
                donation["location"]["latitude"],
                donation["location"]["longitude"]
            )
            donation["distance"] = round(distance, 2)
        
        donations.sort(key=lambda x: x.get("distance", float('inf')))
    
    return donations

@api_router.patch("/donations/{donation_id}/status")
async def update_donation_status(donation_id: str, status: str, current_user: dict = Depends(get_current_user)):
    donation = await db.donations.find_one({"id": donation_id})
    if not donation:
        raise HTTPException(status_code=404, detail="Donation not found")
    
    update_data = {"status": status}
    
    # If volunteer is claiming
    if status == "claimed" and current_user["userType"] == "volunteer":
        update_data["volunteerId"] = current_user["id"]
        update_data["volunteerName"] = current_user["name"]
    
    await db.donations.update_one({"id": donation_id}, {"$set": update_data})
    return {"message": "Status updated successfully"}

# ============= FOOD REQUEST ROUTES =============

@api_router.post("/requests", response_model=FoodRequest)
async def create_food_request(request_data: FoodRequestCreate, current_user: dict = Depends(get_current_user)):
    if current_user["userType"] != "receiver":
        raise HTTPException(status_code=403, detail="Only receivers can create requests")
    
    import uuid
    request_id = str(uuid.uuid4())
    request_dict = {
        "id": request_id,
        "receiverId": current_user["id"],
        "receiverName": current_user["name"],
        "foodType": request_data.foodType,
        "quantity": request_data.quantity,
        "urgency": request_data.urgency,
        "location": request_data.location.dict(),
        "notes": request_data.notes,
        "status": "pending",
        "createdAt": datetime.utcnow(),
        "matchedDonationId": None
    }
    
    await db.requests.insert_one(request_dict)
    return request_dict

@api_router.get("/requests", response_model=List[FoodRequest])
async def get_requests(current_user: dict = Depends(get_current_user)):
    if current_user["userType"] == "receiver":
        requests = await db.requests.find({"receiverId": current_user["id"]}).sort("createdAt", -1).to_list(100)
    else:
        requests = await db.requests.find().sort("createdAt", -1).to_list(100)
    return requests

@api_router.post("/requests/{request_id}/match")
async def match_request_with_donation(request_id: str, donation_id: str, current_user: dict = Depends(get_current_user)):
    """Match a food request with a donation"""
    request = await db.requests.find_one({"id": request_id})
    donation = await db.donations.find_one({"id": donation_id})
    
    if not request or not donation:
        raise HTTPException(status_code=404, detail="Request or donation not found")
    
    if donation["status"] != "available":
        raise HTTPException(status_code=400, detail="Donation not available")
    
    # Update request
    await db.requests.update_one(
        {"id": request_id},
        {"$set": {"status": "matched", "matchedDonationId": donation_id}}
    )
    
    # Update donation
    await db.donations.update_one(
        {"id": donation_id},
        {"$set": {"receiverId": request["receiverId"], "status": "claimed"}}
    )
    
    return {"message": "Request matched successfully"}

# ============= QUALITY CHECK ROUTES =============

@api_router.post("/quality-check")
async def submit_quality_check(quality_check: QualityCheck, current_user: dict = Depends(get_current_user)):
    if current_user["userType"] != "volunteer":
        raise HTTPException(status_code=403, detail="Only volunteers can submit quality checks")
    
    import uuid
    check_dict = quality_check.dict()
    check_dict["id"] = str(uuid.uuid4())
    check_dict["volunteerId"] = current_user["id"],
    check_dict["createdAt"] = datetime.utcnow()
    
    await db.quality_checks.insert_one(check_dict)
    
    # Update donation status based on quality
    if quality_check.overallQuality == "pass":
        await db.donations.update_one(
            {"id": quality_check.donationId},
            {"$set": {"status": "pickedup", "qualityChecked": True}}
        )
    else:
        await db.donations.update_one(
            {"id": quality_check.donationId},
            {"$set": {"status": "rejected", "qualityChecked": True}}
        )
    
    return {"message": "Quality check submitted successfully"}

# ============= FEEDBACK ROUTES =============

@api_router.post("/feedback", response_model=Feedback)
async def create_feedback(feedback_data: FeedbackCreate, current_user: dict = Depends(get_current_user)):
    import uuid
    
    # Get donation to find the other user
    donation = await db.donations.find_one({"id": feedback_data.donationId})
    if not donation:
        raise HTTPException(status_code=404, detail="Donation not found")
    
    # Determine toUserId based on feedbackType
    to_user_id = None
    if feedback_data.feedbackType == "donor_to_volunteer":
        to_user_id = donation.get("volunteerId")
    elif feedback_data.feedbackType == "receiver_to_volunteer":
        to_user_id = donation.get("volunteerId")
    elif feedback_data.feedbackType == "receiver_to_donor":
        to_user_id = donation.get("donorId")
    
    feedback_dict = {
        "id": str(uuid.uuid4()),
        "donationId": feedback_data.donationId,
        "fromUserId": current_user["id"],
        "toUserId": to_user_id,
        "rating": feedback_data.rating,
        "comment": feedback_data.comment,
        "feedbackType": feedback_data.feedbackType,
        "createdAt": datetime.utcnow()
    }
    
    await db.feedback.insert_one(feedback_dict)
    
    # Update user rating
    if to_user_id:
        feedbacks = await db.feedback.find({"toUserId": to_user_id}).to_list(1000)
        avg_rating = sum(f["rating"] for f in feedbacks) / len(feedbacks)
        await db.users.update_one({"id": to_user_id}, {"$set": {"rating": round(avg_rating, 1)}})
    
    return feedback_dict

@api_router.get("/feedback/{user_id}", response_model=List[Feedback])
async def get_user_feedback(user_id: str):
    feedbacks = await db.feedback.find({"toUserId": user_id}).sort("createdAt", -1).to_list(100)
    return feedbacks

# ============= ADMIN ROUTES =============

@api_router.get("/admin/stats")
async def get_admin_stats(current_user: dict = Depends(get_current_user)):
    if current_user["userType"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    total_donations = await db.donations.count_documents({})
    total_requests = await db.requests.count_documents({})
    total_users = await db.users.count_documents({})
    active_volunteers = await db.users.count_documents({"userType": "volunteer"})
    
    donations_by_status = {}
    for status in ["available", "claimed", "pickedup", "delivered", "expired"]:
        count = await db.donations.count_documents({"status": status})
        donations_by_status[status] = count
    
    return {
        "totalDonations": total_donations,
        "totalRequests": total_requests,
        "totalUsers": total_users,
        "activeVolunteers": active_volunteers,
        "donationsByStatus": donations_by_status
    }

@api_router.get("/admin/users")
async def get_all_users(current_user: dict = Depends(get_current_user)):
    if current_user["userType"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    users = await db.users.find({}, {"password": 0}).to_list(1000)
    return users

# ============= INCLUDE ROUTER =============

app.include_router(api_router)



logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=3000, reload=True)
