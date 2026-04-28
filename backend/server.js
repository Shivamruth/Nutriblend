import express from "express";
import Razorpay from "razorpay";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ✅ CREATE ORDER
app.post("/create-order", async (req, res) => {
  try {
    const { amount } = req.body;

    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency: "INR",
      receipt: "receipt_" + Date.now(),
    });

    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error creating order");
  }
});

// ✅ IN-MEMORY STORAGE (TEMP)
let orders = [];

// ✅ SAVE ORDER
app.post("/save-order", (req, res) => {
  const order = {
    id: Date.now(),
    ...req.body,
  };

  orders.push(order);
  res.json(order);
});

// ✅ GET ORDERS
app.get("/orders", (req, res) => {
  res.json(orders);
});

app.listen(5000, () => console.log("Server running on port 5000"));