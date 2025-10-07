import os
import base64
import re
from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
from io import BytesIO
from PIL import Image
from datetime import datetime
import tensorflow as tf
from tensorflow.keras.applications import EfficientNetB0
from tensorflow.keras.applications.efficientnet import preprocess_input
import mysql.connector

os.environ["CUDA_VISIBLE_DEVICES"] = "-1"

# --- 1. การตั้งค่าพื้นฐาน ---
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "https://g1weds.consolutechcloud/web.com"}})

# --- 2. การตั้งค่า Database ---
DB_HOST = "localhost"
DB_USER = "g1weds_trash_i_project"
DB_PASSWORD = "8BFakgKsmhzAAqEByTpM"
DB_NAME = "g1weds_trash_i_project"

def get_db_connection():
    try:
        conn = mysql.connector.connect(host=DB_HOST, user=DB_USER, password=DB_PASSWORD, database=DB_NAME)
        return conn
    except mysql.connector.Error as e:
        print(f"Database connection error: {e}")
        return None

# --- 3. ส่วนสร้างและโหลดโมเดล ---
print("Loading Keras model and labels...")
MODEL_PATH = os.path.join(os.path.dirname(__file__), "model", "trash_i_finish.h5")
LABELS_PATH = "labels.txt"
CONFIDENCE_THRESHOLD = 0.60 # ✅ ฟีเจอร์เดียวที่เราจะเพิ่มเข้าไป

model = None
labels = []
try:
    base_model = EfficientNetB0(include_top=False, input_shape=(224, 224, 3), weights="imagenet")
    base_model.trainable = False
    model = tf.keras.Sequential([
        tf.keras.layers.Input(shape=(224, 224, 3)),
        base_model,
        tf.keras.layers.GlobalAveragePooling2D(),
        tf.keras.layers.Dropout(0.2),
        tf.keras.layers.Dense(11, activation='softmax')
    ])
    model.load_weights(MODEL_PATH, by_name=True, skip_mismatch=False)
    with open(LABELS_PATH, 'r', encoding='utf-8') as f:
        labels = [line.strip() for line in f.readlines()]
    print(f"-> Model '{MODEL_PATH}' and labels loaded successfully.")
except Exception as e:
    print(f"FATAL: Error loading model: {e}")
    model = None

# --- 4. ฟังก์ชันเตรียมรูปภาพ ---
def preprocess_image(img, target_size=(224, 224)):
    if img.mode != "RGB":
        img = img.convert("RGB")
    img = img.resize(target_size)
    img_array = np.array(img, dtype=np.float32)
    img_array = np.expand_dims(img_array, axis=0)
    return preprocess_input(img_array)

# --- 5. API Endpoints ---
@app.route("/", methods=["GET"])
def home():
    return jsonify({"message": "Trashi API is running."})

# ✅ START: ใช้ฟังก์ชัน predict() ตามโครงสร้างต้นฉบับของคุณ 100%
@app.route('/predict', methods=['POST', 'OPTIONS'])
def predict():
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
        
    if model is None or not labels:
        return jsonify({"error": "Model or labels not loaded"}), 500

    data = request.get_json()
    if not data or "image_base64" not in data:
        return jsonify({"error": "No image_base64 provided"}), 400
        
    try:
        # ใช้วิธี .split() ตามต้นฉบับ
        image_data = data["image_base64"].split(",")[1]
        img = Image.open(BytesIO(base64.b64decode(image_data)))
        processed_img = preprocess_image(img)
        
        prediction_scores = model.predict(processed_img)[0]
        predicted_index = np.argmax(prediction_scores)
        predicted_class = labels[predicted_index]
        confidence = float(prediction_scores[predicted_index])

        # ✅ ฟีเจอร์เดียวที่เพิ่มเข้ามา: ตรวจสอบค่า Confidence
        if confidence < CONFIDENCE_THRESHOLD:
            predicted_class = "unknow"

        # Logic การให้คำแนะนำและบันทึก Database ตามต้นฉบับ
        recommendations = {
            "bag_plastic": "ถังขยะทั่วไป", "bottle_plastic": "ถังขยะรีไซเคิล",
            "box_paper": "ถังขยะรีไซเคิล", "box_plastic": "ถังขยะรีไซเคิล",
            "can": "ถังขยะรีไซเคิล", "cup_paper": "ถังขยะรีไซเคิล",
            "cup_plastic": "ถังขยะรีไซเคิล", "paper": "ถังขยะรีไซเคิล",
            "stick": "ถังขยะอินทรีย์", "tools": "ถังขยะอันตราย",
            "unknow": "ไม่สามารถระบุประเภทได้"
        }
        recommendation_text = recommendations.get(predicted_class, "ไม่สามารถระบุประเภทได้")
        
        conn = get_db_connection()
        if conn:
            try:
                cursor = conn.cursor()
                sql_log = "INSERT INTO prediction_logs (predicted_class, confidence, recommendation) VALUES (%s, %s, %s)"
                cursor.execute(sql_log, (predicted_class, confidence, recommendation_text))
                sql_count = "INSERT INTO class_counts (class_name, prediction_count) VALUES (%s, 1) ON DUPLICATE KEY UPDATE prediction_count = prediction_count + 1"
                cursor.execute(sql_count, (predicted_class,))
                conn.commit()
            finally:
                if conn.is_connected():
                    conn.close()
        
        result = { "prediction": predicted_class, "confidence": round(confidence, 4), "recommendation": recommendation_text }
        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": f"An unexpected error occurred: {e}"}), 500
# ✅ END: สิ้นสุดฟังก์ชัน predict()

@app.route('/api/dashboard-data', methods=['GET'])
def get_dashboard_data():
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM class_counts ORDER BY prediction_count DESC")
        counts = cursor.fetchall()
        
        total_scans = sum(item['prediction_count'] for item in counts)
        item_counts = {item['class_name']: item['prediction_count'] for item in counts}
        
        dashboard_data = {"totalScans": total_scans, "itemCounts": item_counts}
        return jsonify(dashboard_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn.is_connected():
            conn.close()

# --- 6. รันเซิร์ฟเวอร์ ---
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=4700, debug=False)
