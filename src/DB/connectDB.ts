import { connect } from "mongoose";
export async function connectDB() {
  connect(process.env.MONGO_URI!)
    .then(() => console.log("Success to connect DB 🚀"))
    .catch((error) => console.log("Fail to connect DB ❌", error));
}