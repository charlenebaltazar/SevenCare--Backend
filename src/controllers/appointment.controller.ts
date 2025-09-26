import { NextFunction, Request, Response } from "express";
import Appointment from "../models/appointment.model";
import catchAsync from "../utils/catchAsync";
import AppError from "../utils/appError";

export const createAppointment = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { medicalDepartment, date, time, email, phoneNumber } = req.body;

    if (!medicalDepartment || !date || !time || !email || !phoneNumber)
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
      data: normalizeAppointments([newAppointment])[0],
    });
  },
);

export const getAppointments = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    let appointments = await Appointment.find({
      patientId: req.user._id,
      isDeleted: false,
    }).sort({ schedule: 1 });

    res.status(200).json({
      status: "Success",
      data: normalizeAppointments(appointments),
    });
  },
);

export const deleteAppointment = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const apptId = req.params.id;

    if (!apptId) return next(new AppError("Appointment not found", 404));

    const result = await Appointment.deleteOne({ _id: apptId });

    if (result.deletedCount === 0)
      return next(new AppError("Appointment not found", 404));

    res
      .status(200)
      .json({ status: "Success", msg: "Appointment successfully deleted" });
  },
);

export const getAllPendingAppointments = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    let appointments = await Appointment.find({
      isDeleted: false,
      status: "Pending",
    })
      .sort({ schedule: 1 })
      .populate("patientId", "firstname surname");

    res.status(200).json({
      status: "Success",
      results: appointments.length,
      data: normalizeAppointments(appointments),
    });
  },
);

export const getTodayApprovedAppointments = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const now = new Date();

    const offset = 8 * 60;

    const startOfDay = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0 - 8,
        0,
        0,
        0,
      ),
    );

    const endOfDay = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        23 - 8,
        59,
        59,
        999,
      ),
    );

    const appointments = await Appointment.find({
      isDeleted: false,
      status: "Approved",
      schedule: { $gte: startOfDay, $lte: endOfDay },
    })
      .sort({ schedule: 1 })
      .populate("patientId", "firstname surname");

    res.status(200).json({
      status: "Success",
      results: appointments.length,
      data: normalizeAppointments(appointments),
    });
  },
);

export const getAllAppointments = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    let appointments = await Appointment.find({ isDeleted: false })
      .sort({
        schedule: 1,
      })
      .populate("patientId", "firstname surname");

    res.status(200).json({
      status: "Success",
      results: appointments.length,
      data: normalizeAppointments(appointments),
    });
  },
);

export const updateAppointmentStatus = async (req: Request, res: Response) => {
  try {
    const { id, action } = req.params;

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    if (appointment.status !== "Pending" && action !== "noshow") {
      return res.status(400).json({
        message: "Only pending appointments can be approved/declined",
      });
    }

    if (action === "approve") {
      appointment.status = "Approved";
    } else if (action === "decline") {
      appointment.status = "Declined";
    } else if (action === "noshow") {
      appointment.status = "No Show";
    } else {
      return res.status(400).json({ message: "Invalid action" });
    }

    await appointment.save();
    res.status(200).json({
      message: "Appointment updated",
      appointment: normalizeAppointments([appointment])[0],
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

export const getCancelledAppointments = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const appointments = await Appointment.find({
      isDeleted: false,
      status: { $in: ["Cancelled", "No Show"] },
    }).sort({ schedule: 1 });

    res.status(200).json({
      status: "Success",
      results: appointments.length,
      data: normalizeAppointments(appointments),
    });
  },
);

function normalizeAppointments(appts: any[]) {
  return appts.map((appt) => {
    const obj = appt.toObject ? appt.toObject() : appt;
    const date = new Date(obj.schedule);

    date.setHours(date.getHours() - 8);
    obj.schedule = date.toISOString();

    if (obj.patientId) {
      obj.patientName = `${obj.patientId.firstname} ${obj.patientId.surname}`;
      delete obj.patientId;
    }

    return obj;
  });
}
