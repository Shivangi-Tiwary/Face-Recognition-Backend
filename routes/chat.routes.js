const express = require("express");
const router = express.Router();
const auth = require("../middleware/protect.middleware");
const ctrl = require("../controllers/chat.controller");
const { upload } = require("../middleware/auth.middleware");

router.get("/users", auth, ctrl.getAllUsers);
router.get("/rooms", auth, ctrl.getMyRooms);
router.get("/dm/:targetUserId", auth, ctrl.getOrCreateDM);
router.post("/group", auth, ctrl.createGroup);
router.get("/messages/:roomId", auth, ctrl.getMessages);
router.post("/room/:roomId/add-member", auth, ctrl.addMember);

// ── New routes ──
router.get("/room/:roomId/invite", auth, ctrl.getInviteLink);
router.post("/room/:roomId/invite-email", auth, ctrl.sendInviteEmail);
router.get("/join/:inviteCode", auth, ctrl.joinViaInvite);
router.delete("/message/:messageId", auth, ctrl.deleteMessage);
router.post("/room/:roomId/leave", auth, ctrl.leaveGroup);
router.post("/upload", auth, upload.single("file"), ctrl.uploadFile);
module.exports = router;