// @ts-nocheck
import imagekit from "../configs/imagekit.js";
import Booking from "../models/Booking.js";
import Car from "../models/car.js";
import User from "../models/User.js";
import fs from "fs";

export const changeRoleToOwner = async (req, res) => {
  try {
    const { _id } = req.user;
    await User.findByIdAndUpdate(_id, { role: "owner" });
    res.status(200).json({ success: true, message: "Role changed to owner" });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addCar = async (req, res) => {
  try {
    const { _id } = req.user;
    let car = JSON.parse(req.body.carData);
    const imageFile = req.file;

    //* upload image to Imagekit
    const fileBuffer = fs.readFileSync(imageFile.path);
    const response = await imagekit.upload({
      file: fileBuffer,
      fileName: imageFile.originalname,
      folder: "/cars",
    });

    //* optimize through imagekit URL transformation
    const optimizedImageUrl = imagekit.url({
      path: response.filePath,
      transformation: [
        { width: "1280" }, //* width resizing
        { quality: "auto" }, //* Auto compression
        { format: "webp" }, //* convert to modern format
      ],
    });

    const image = optimizedImageUrl;

    await Car.create({ ...car, owner: _id, image });

    res.status(200).json({ success: true, message: "Car added successfully" });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getOwnerCars = async (req, res) => {
  try {
    const { _id } = req.user;
    const cars = await Car.find({ owner: _id });

    res.status(200).json({ success: true, cars });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const toggleCarAvailability = async (req, res) => {
  try {
    const { _id } = req.user;
    const { carId } = req.body;
    const car = await Car.findById(carId);

    if (car?.owner?.toString() !== _id.toString()) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    car.isAvailable = !car.isAvailable;

    await car?.save();

    res.status(200).json({
      success: true,
      message: "Car availability toggled successfully",
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteCar = async (req, res) => {
  try {
    const { _id } = req.user;
    const { carId } = req.body;
    const car = await Car.findById(carId);

    if (car?.owner?.toString() !== _id.toString()) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    car.owner = null;
    car.isAvailable = false;

    await car.save();

    res
      .status(200)
      .json({ success: true, message: "Car deleted successfully" });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getDashboardData = async (req, res) => {
  try {
    const { _id, role } = req.user;

    if (role !== "owner") {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const cars = await Car.find({ owner: _id });
    const bookings = await Booking.find({ owner: _id })
      .populate("car")
      .sort({ createdAt: -1 });

    const pendingBookings = await Booking.find({
      owner: _id,
      status: "pending",
    });
    const completedBookings = await Booking.find({
      owner: _id,
      status: "confirmed",
    });

    //* Calculate Monthly Revenue
    const monthlyRevenue = bookings
      .slice()
      .filter((booking) => booking.status === "confirmed")
      .reduce((acc, booking) => acc + booking.price, 0);

    const dashboardData = {
      totalCars: cars.length,
      totalBookings: bookings.length,
      pendingBookings: pendingBookings.length,
      completedBookings: completedBookings.length,
      recentBookings: bookings.slice(0, 3),
      monthlyRevenue,
    };

    res.status(200).json({ success: true, dashboardData });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

//* to update user image
export const updateUserImage = async (req, res) => {
  try {
    const { _id } = req.user;

    const imageFile = req.file;

    //* upload image to Imagekit
    const fileBuffer = fs.readFileSync(imageFile.path);
    const response = await imagekit.upload({
      file: fileBuffer,
      fileName: imageFile.originalname,
      folder: "/users",
    });

    //* optimize through imagekit URL transformation
    const optimizedImageUrl = imagekit.url({
      path: response.filePath,
      transformation: [
        { width: "400" }, //* width resizing
        { quality: "auto" }, //* Auto compression
        { format: "webp" }, //* convert to modern format
      ],
    });

    const image = optimizedImageUrl;

    await User.findByIdAndUpdate(_id, { image });

    res
      .status(200)
      .json({ success: true, message: "Image updated successfully" });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};
