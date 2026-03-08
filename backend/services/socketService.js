const { activeProcesses } = require('../routes/compiler');

// In-memory map: studentId (string) -> socket.id
const studentSocketMap = new Map();

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log(`New client connected: ${socket.id}`);

    // Sandbox standard input handling
    socket.on('code:input', (data) => {
      const process = activeProcesses.get(socket.id);
      if (process && process.stdin) {
        process.stdin.write(data.input + '\n');
      }
    });

    // Student joining their normal heartbeat and initial online event
    socket.on('student:online', (data) => {
      const sid = String(data.studentId);
      console.log(`student:online received from ${sid} (socket: ${socket.id}) for class ${data.classId}`);
      if (data.classId) {
        socket.join(`class_${data.classId}`);
        socket.join(`student_${sid}`);
        studentSocketMap.set(sid, socket.id);
        io.to(`teacher_${data.classId}`).emit('student:activity', {
          studentId: data.studentId,
          studentName: data.studentName,
          rollNo: data.rollNo,
          activity: 'Active',
          action: 'Online',
          classId: data.classId
        });
      }
    });

    socket.on('student:ping', (data) => {
      const sid = String(data.studentId);
      studentSocketMap.set(sid, socket.id);
      if (data.classId) {
        io.to(`teacher_${data.classId}`).emit('student:activity', {
          studentId: data.studentId,
          studentName: data.studentName,
          rollNo: data.rollNo,
          activity: 'Active',
          action: 'Browser Open',
          classId: data.classId
        });
      }
    });

    // Existing / backward compatibility for old lab
    socket.on('join_class', ({ studentId, classId }) => {
      const sid = String(studentId);
      socket.join(`class_${classId}`);
      socket.join(`student_${sid}`);
      studentSocketMap.set(sid, socket.id);
      io.to(`teacher_${classId}`).emit('student:online', { studentId });
    });

    // Teacher joins their monitoring room
    socket.on('join_teacher_monitor', ({ classId }) => {
      console.log(`Teacher ${socket.id} joined monitor room for class ${classId}`);
      socket.join(`teacher_${classId}`);
    });

    socket.on('student:heartbeat', (data) => {
      // data: { studentId, activity, currentTask, classId }
      io.to(`teacher_${data.classId}`).emit('student:activity', data);
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
      // Clean up from studentSocketMap if this was the latest socket for a student
      for (const [studentId, mappedSocketId] of studentSocketMap.entries()) {
        if (mappedSocketId === socket.id) {
          studentSocketMap.delete(studentId);
          console.log(`Removed student ${studentId} from socket map`);
          break;
        }
      }
    });

    // Screen sharing — push model
    // Teacher clicks "Start Watching" → student starts 3-sec screenshot loop
    socket.on('teacher:start_watching', (data) => {
      const sid = String(data.studentId);
      const studentSocketId = studentSocketMap.get(sid);
      console.log(`Teacher starts watching student ${sid} — socket: ${studentSocketId || 'NOT FOUND'}`);
      if (studentSocketId) {
        io.to(studentSocketId).emit('teacher:start_watching');
      }
    });

    socket.on('teacher:stop_watching', (data) => {
      const sid = String(data.studentId);
      const studentSocketId = studentSocketMap.get(sid);
      if (studentSocketId) {
        io.to(studentSocketId).emit('teacher:stop_watching');
      }
    });

    socket.on('student:screen_stream', (data) => {
      console.log(`Screen stream from student ${data.studentId}, classId: ${data.classId}, len: ${data.screenBase64?.length}`);
      if (data.classId) {
        io.to(`teacher_${data.classId}`).emit('student:screen_stream', data);
      }
    });
  });
};
