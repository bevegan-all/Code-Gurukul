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
      const cid = data.classId ? String(data.classId) : 'none';
      
      console.log(`[Socket] Student Online: ${data.studentName} (ID: ${sid}, Class: ${cid})`);
      
      // Tag socket for automatic offline on disconnect
      socket.studentInfo = data;
      socket.join(`class_${cid}`);
      socket.join(`student_${sid}`);
      studentSocketMap.set(sid, socket.id);
      
      // Notify all rooms the teacher might be in
      const payload = {
        studentId: data.studentId,
        studentName: data.studentName,
        rollNo: data.rollNo,
        activity: data.activity || 'Active',
        action: data.action || 'Online',
        classId: data.classId,
        lastSeen: Date.now()
      };
      
      io.to(`teacher_${cid}`).emit('student:activity', payload);
    });

    socket.on('student:ping', (data) => {
      const sid = String(data.studentId);
      const cid = data.classId ? String(data.classId) : 'none';
      
      studentSocketMap.set(sid, socket.id);
      socket.studentInfo = data; 
      
      const payload = {
        studentId: data.studentId,
        studentName: data.studentName,
        rollNo: data.rollNo,
        activity: data.activity || 'Active',
        action: data.action || 'Working',
        classId: data.classId,
        lastSeen: Date.now()
      };
      
      io.to(`teacher_${cid}`).emit('student:activity', payload);
    });

    socket.on('student:activity', (data) => {
      const cid = data.classId ? String(data.classId) : 'none';
      const payload = { ...data, lastSeen: Date.now() };
      io.to(`teacher_${cid}`).emit('student:activity', payload);
    });

    // Teacher joins their monitoring room
    socket.on('join_teacher_monitor', (data) => {
      const { classId } = data;
      if (classId) {
        console.log(`[Socket] Teacher ${socket.id} joined monitor room for class ${classId}`);
        socket.join(`teacher_${classId}`);
      }
    });

    socket.on('disconnect', () => {
      if (socket.studentInfo) {
        const { studentId, studentName, rollNo, classId } = socket.studentInfo;
        const cid = classId ? String(classId) : 'none';
        
        console.log(`[Socket] Student Offline: ${studentName} (ID: ${studentId})`);
        
        const payload = {
          studentId,
          studentName,
          rollNo,
          classId,
          activity: 'Offline',
          action: 'Disconnected',
          lastSeen: 0
        };
        
        io.to(`teacher_${cid}`).emit('student:activity', payload);
      }

      // Clean up from studentSocketMap
      for (const [studentId, mappedSocketId] of studentSocketMap.entries()) {
        if (mappedSocketId === socket.id) {
          studentSocketMap.delete(studentId);
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

    socket.on('teacher:request_status', (data) => {
      const { classId } = data;
      const target = classId ? `class_${classId}` : 'none';
      console.log(`[Socket] Teacher ${socket.id} requested status for ${target}`);
      if (classId) {
        io.to(`class_${classId}`).emit('teacher:request_status');
      } else {
        // Broadcast to all students if no classId provided
        io.emit('teacher:request_status');
      }
    });

    socket.on('student:screen_stream', (data) => {
      if (data.classId) {
        io.to(`teacher_${data.classId}`).emit('student:screen_stream', data);
      }
    });
  });
};
