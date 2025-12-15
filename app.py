from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import tensorflow as tf
import numpy as np
from PIL import Image
import io

app = FastAPI()

# ✅ CORS (dev). Later set this to your real frontend URL.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_PATH = "image_model.keras"
model = tf.keras.models.load_model(MODEL_PATH)

CLASS_NAMES = [
    "Apple___Apple_scab",
    "Apple___Black_rot",
    "Apple___Cedar_apple_rust",
    "Apple___healthy",
    "Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot",
    "Corn_(maize)___Common_rust_",
    "Corn_(maize)___Northern_Leaf_Blight",
    "Corn_(maize)___healthy",
    "Pepper__bell___Bacterial_spot",
    "Pepper__bell___healthy",
    "Potato___Early_blight",
    "Potato___Late_blight",
    "Potato___healthy",
    "Tomato_Bacterial_spot",
    "Tomato_Early_blight",
    "Tomato_Late_blight",
    "Tomato_Leaf_Mold",
    "Tomato_Septoria_leaf_spot",
    "Tomato_Spider_mites_Two_spotted_spider_mite",
    "Tomato__Target_Spot",
    "Tomato__Tomato_YellowLeaf__Curl_Virus",
    "Tomato__Tomato_mosaic_virus",
    "Tomato_healthy",
]

@app.get("/")
def home():
    return {"status": "Backend running", "model": "loaded"}

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    image_bytes = await file.read()
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

    # ✅ Your model expects (128,128,3) (from your model.summary)
    image = image.resize((128, 128))

    img_array = np.array(image, dtype=np.float32)
    img_array = np.expand_dims(img_array, axis=0)

    # ✅ Don't use model.predict if you want; both work
    preds = model(img_array, training=False).numpy()[0]  # shape (23,)

    top_idx = int(np.argmax(preds))
    confidence = float(preds[top_idx])

    # top-3
    top3_idx = preds.argsort()[-3:][::-1]
    top3 = [
        {"class": CLASS_NAMES[int(i)], "confidence": float(preds[int(i)])}
        for i in top3_idx
    ]

    return {
        "predicted_class": CLASS_NAMES[top_idx],
        "confidence": confidence,
        "top3": top3,
    }
