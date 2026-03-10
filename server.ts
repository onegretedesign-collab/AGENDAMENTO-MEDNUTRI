import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import twilio from "twilio";
import admin from "firebase-admin";

dotenv.config();

// Lazy initialization for services
let twilioClient: twilio.Twilio | null = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY_JSON) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY_JSON);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (e) {
    console.error("Failed to initialize Firebase Admin:", e);
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });
  const PORT = 3000;

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // In-memory appointments
  let appointments: { id: string, patientName: string, contact: string, date: string, time: string }[] = [];

  app.get("/api/appointments", (req, res) => {
    res.json(appointments);
  });

  app.post("/api/appointments", (req, res) => {
    const appointment = { id: Date.now().toString(), ...req.body };
    appointments.push(appointment);
    res.json(appointment);
  });

  app.patch("/api/appointments/:id", (req, res) => {
    const { status } = req.body;
    appointments = appointments.map(a => a.id === req.params.id ? { ...a, status } : a);
    res.json(appointments.find(a => a.id === req.params.id));
  });

  app.delete("/api/appointments/:id", (req, res) => {
    appointments = appointments.filter(a => a.id !== req.params.id);
    res.status(204).send();
  });

  // Notify Attendant (WhatsApp)
  app.post("/api/notify-attendant", async (req, res) => {
    const { patientName, city, type } = req.body;
    if (twilioClient && process.env.TWILIO_PHONE_NUMBER) {
      try {
        await twilioClient.messages.create({
          body: `Novo agendamento: ${patientName} - ${type} em ${city}`,
          from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
          to: `whatsapp:+5564984530700`, // Attendant number
        });
        res.json({ success: true });
      } catch (e) {
        console.error("Twilio error:", e);
        res.status(500).json({ error: "Failed to notify attendant" });
      }
    } else {
      res.status(500).json({ error: "Twilio not configured" });
    }
  });

  // Notify Patient (WhatsApp)
  app.post("/api/notify-patient-whatsapp", async (req, res) => {
    const { phoneNumber, message } = req.body;
    if (twilioClient && process.env.TWILIO_PHONE_NUMBER) {
      try {
        await twilioClient.messages.create({
          body: message,
          from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
          to: `whatsapp:${phoneNumber}`,
        });
        res.json({ success: true });
      } catch (e) {
        console.error("Twilio WhatsApp error:", e);
        res.status(500).json({ error: "Failed to notify patient" });
      }
    } else {
      res.status(500).json({ error: "Twilio not configured" });
    }
  });

  // Notify Patient (Push)
  app.post("/api/notify-patient", async (req, res) => {
    const { token, message } = req.body;
    if (admin.apps.length > 0) {
      try {
        await admin.messaging().send({
          token,
          notification: { title: "MedNutri", body: message },
        });
        res.json({ success: true });
      } catch (e) {
        console.error("Firebase error:", e);
        res.status(500).json({ error: "Failed to notify patient" });
      }
    } else {
      res.status(500).json({ error: "Firebase not configured" });
    }
  });

  // Socket.io logic
  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("chat:join", (room) => {
      socket.join(room);
      console.log(`User ${socket.id} joined room ${room}`);
    });

    socket.on("get:rooms", () => {
      const rooms = Array.from(io.sockets.adapter.rooms.keys()).filter(r => !io.sockets.adapter.sids.has(r));
      socket.emit("rooms:list", rooms);
    });

    socket.on("chat:message", (data) => {
      io.to(data.room).emit("chat:message", data);
    });

    socket.on("chat:appointment-confirmed", (data) => {
      io.to(data.room).emit("chat:appointment-confirmed", data);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
