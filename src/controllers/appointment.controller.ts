import { NextFunction, Request, Response } from "express";
import Appointment from "../models/appointment.model";
import catchAsync from "../utils/catchAsync";
import AppError from "../utils/appError";

export const createAppointment = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { medicalDepartment, date, time, email, phoneNumber } = req.body;

    if (!medicalDepartment || !date || !time || !email)
      return next(new AppError("Invalid empty fields", 400));

    const schedule = new Date(`${date}T${time}:00`);

    if (isNaN(schedule.getTime()))
      return next(new AppError("Invalid date or time format", 400));

    const newAppointment = await Appointment.create({
      patientId: req.user._id,
      medicalDepartment,
      schedule,
      email,
      phoneNumber,
    });

    res.status(201).json({
      status: "Success",
      data: newAppointment,
    });
  },
);

export const getAppointments = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const appointments = await Appointment.find({
      patientId: req.user._id,
      isDeleted: false,
    }).sort({ schedule: 1 });

    res.status(200).json({ status: "Success", data: appointments });
  },
);
