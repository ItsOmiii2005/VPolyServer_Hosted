const Class = require('../models/Class');
const StudentAttendance = require('../models/studentAttendance');
const Student = require('../models/Student');
const nodemailer = require('nodemailer');




const attendanceControllers = {
sendemail: async  (req, res) => {
  // console.log(req.body)
  // Get the Blob data from the FormData
  const attachmentBlob = req.files.file; // Assuming the file is sent with the key 'file'
  console.log(attachmentBlob)
  // Create a Nodemailer transporter
  var transporter = nodemailer.createTransport({
    host: "live.smtp.mailtrap.io",
    port: 587,
    auth: {
      user: "api",
      pass: "61f171185bd4ab1c4d65d4441ecf35d1"
    }
  });

  // Mail options
  const mailOptions = {
      from: 'VPolyServer@demomailtrap.com',
      to: 'omanandswami2005@gmail.com',
      subject: 'Attendance Report By VPolyServer',
      text: `Please find the attached attendance report below.|| Name :${attachmentBlob.name}  ||  Thank you !`,
      attachments: [
        {
            filename: attachmentBlob.name,
            content: attachmentBlob.data // Assuming the Blob data is stored in 'data' property
        }
    ]
  };

  // Send the email
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email:', error);
      // Send error response
      return res.status(500).json({ message: 'Error sending email' });
    } else {
      console.log('Email sent:', info.response);
      // Send success response
      return res.status(200).json({ message: 'Email sent successfully' });
    }
  });


},

  viewAttendance: async (req, res) => {
    try {
      const { selectedClass, dateRange, timeSlot } = req.body;
      // console.log(selectedClass, timeRange, timeSlot);
    // Convert startDate and endDate to ISO string format
    const startDate = new Date(dateRange.startDate);
    startDate.setUTCHours(0, 0, 0, 0);
    
    const endDate = new Date(dateRange.endDate);
    endDate.setUTCHours(0,0,0,0);
    
    
       // Find the class ID based on the class name
       const classInfo = await Class.findById({_id:selectedClass}).populate('students');
    
       if (!classInfo) {
         return res.status(404).json({ error: 'Class not found' });
       }
      // console.log(classInfo);
    
    
      const students = classInfo.students;
     // Fetch attendance data for each student based on the provided parameters
    //  console.log(dateRange);
    console.log(timeSlot);
     const attendanceData = [];
    
     
     for (const student of students) {
    
      let query = {
        studentId: student._id,
        date: { $gte: startDate, $lte: endDate }
      };
    
      // If timeSlot is not "All Time Slot", include it in the query
      if (timeSlot !== "All Time Slots") {
        query.timeSlot = timeSlot;
      }
    
      const studentAttendance = await StudentAttendance.find(query).select('date present'); // Select only required fields
    
          attendanceData.push({
            studentName: student.name,
            attendance: studentAttendance,
            rollNo : student.rollNo,
          });
     }
    // console.log(attendanceData);
     res.json({ attendanceData });
    
    
    
    }   catch (error) {
    
      console.log(error);
    }
  }
,
  getAttendanceByStudentEnroll:
    async (req, res) => {
      const studentEnrollmentNo = req.params.studentEnrollmentNo;

      const { startDate, endDate, selectedMonth, selectedTimeSlot } = req.query;
      // console.log( startDate, endDate, selectedMonth,selectedTimeSlot);

      try {
        const year = new Date().getFullYear();
        let startDateTime, endDateTime;

        if (selectedMonth !== undefined) {
          const month = Number(selectedMonth);
          startDateTime = new Date(year, month, 2);
          endDateTime = new Date(year, month + 1, 1);
        } else {
          startDateTime = startDate ? new Date(startDate) : new Date(0);
          endDateTime = endDate ? new Date(endDate) : new Date();
        }

        const attendanceData = await StudentAttendance.find({
          studentEnrollmentNo,
          date: { $gte: startDate ? startDate : startDateTime, $lte: endDate ? endDate : endDateTime },
          timeSlot: selectedTimeSlot
        });

        res.json(attendanceData);
      } catch (error) {
        console.error('Error fetching attendance data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    }
  ,




  getAllAttendance: async (req, res) => {
    const enrollArray = req.query.enrollArray;
    const selectedClass = req.query.selectedClass;
    const selectedMonth = req.query.selectedMonth;
    const selectedTimeSlot = req.query.selectedTimeSlot;
    const { startDate, endDate } = req.query;

    console.log(selectedMonth ? "yes" : "", selectedTimeSlot ? "yes" : "");

    try {
      const year = new Date().getFullYear();
      let startDateTime, endDateTime;

      if (selectedMonth !== undefined) {
        const month = Number(selectedMonth);
        startDateTime = new Date(year, month, 2);
        endDateTime = new Date(year, month + 1, 1);
      } else {
        startDateTime = startDate ? new Date(startDate) : new Date(0);
        endDateTime = endDate ? new Date(endDate) : new Date();
      }

      const attendanceData = await StudentAttendance.find({
        studentEnrollmentNo: { $in: enrollArray },
        date: { $gte: startDate ? startDate : startDateTime, $lte: endDate ? endDate : endDateTime },
        timeSlot: selectedTimeSlot
      });
      console.log(attendanceData);
      res.json(attendanceData);
    } catch (error) {
      console.error('Error fetching attendance data:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },



  getAllStudentForMalualAttendance: async (req, res) => {
    const { selectedDate, selectedTimeSlot, className } = req.body;
  
    try {
      // Find the class by name and populate its students
      const classData = await Class.findOne({ name: className }).populate('students', 'name enrollmentNo rollNo');
  
      if (!classData) {
        return res.status(404).json({ message: `Class '${className}' not found.` });
      }
  const currentDate = new Date(selectedDate);
  currentDate.setUTCHours(0,0,0,0);

// currentDate.setDate(currentDate.getDate() + 1);

      console.log(`Class: ${classData.name}`);
      console.log('Students:');
  
      // Get an array of existing student IDs for the given date and time slot
      const existingStudentIds = (
        await StudentAttendance.find({
          date: currentDate,
          timeSlot: selectedTimeSlot,
        })
      ).map((attendance) => attendance.studentId.toString());
  
      // Filter students who are not present and whose attendance record does not exist
      const studentsToAdd = classData.students
        .filter((student) => !existingStudentIds.includes(student._id.toString()))
        .map((student) => ({
          studentId: student._id,
          date: currentDate,
          timeSlot: selectedTimeSlot,
          present: false,
        }));
  
      // Insert new student attendance records if there are any
      if (studentsToAdd.length > 0) {
        await StudentAttendance.insertMany(studentsToAdd);
      }
  
      // Now, send all the student attendance data as a response, including both existing and newly added records
      const allStudentAttendance = await StudentAttendance.find({
        date: currentDate,
        timeSlot: selectedTimeSlot,
      }).populate({
        path: 'studentId',
        select: 'name enrollmentNo rollNo',
        populate: {
          path: 'class', // Populate the class field in studentId
        },
      });
  
      const filteredStudentAttendance = allStudentAttendance.filter(
        (attendance) => attendance.studentId?.class?.name === className
      );
  
      // console.log(filteredStudentAttendance);
      console.log(currentDate)
      const finalAttendance = filteredStudentAttendance.map((attendance) => ({
        _id: attendance.studentId._id,
        name: attendance.studentId.name,
        enrollmentNo: attendance.studentId.enrollmentNo,
        rollNo: attendance.studentId.rollNo,
        present: attendance.present.toString(),
      }))
  
      res.json({ data: true, studentAttendance: finalAttendance });
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
  ,




  
  updateAttendance: async (req, res) => {

    const studentEnrollmentNo = req.params.id;
    const { selectedDate, selectedTimeSlot } = req.body;
    console.log(studentEnrollmentNo, selectedDate, selectedTimeSlot);
    try {
      
      const currentDate = new Date(selectedDate);
      currentDate.setUTCHours(0,0,0,0);

    
    const student = await Student.findOne({ enrollmentNo: studentEnrollmentNo });
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Also update the corresponding record in the main database
    const mainRecord = await StudentAttendance.findOne({
      studentId: student._id,
      date: currentDate,
      timeSlot: selectedTimeSlot,
    });

      if (!mainRecord) {
        // If the record doesn't exist in the main database, return an error
        return res.status(404).json({ error: 'Record not found' });
      }
      // console.log("Mainrecbefor" + mainRecord);

      mainRecord.present = !mainRecord.present;
      await mainRecord.save();
      
      console.log("Mainrecafter" + mainRecord);

      res.json({ data: true, mainRecord });
      // res.json({ data: true, userData });
    } catch (error) {
      console.error('Error updating data:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },



  updateAllAttendance: async (req, res) => {
    const { date, timeSlot } = req.params;
    const { present, className } = req.body;

    console.log(date, timeSlot, present,className);
  
    try {
      const currentDate = new Date(date);
      // currentDate.setMilliseconds(0);
      currentDate.setUTCHours(0,0,0,0);
      // currentDate.setDate(currentDate.getDate() + 1);
      // Find all students for the given date, time slot, and class
      const students = await StudentAttendance.find({
        date: currentDate,
        timeSlot,
      }).populate({
        path: 'studentId',
        match: { 'class.name': className }, // Filter students based on class name
        populate: {
          path: 'class', // Populate the class field in studentId
        },
      });
      console.log(students);
  
      // Update the present status for all students
      await Promise.all(
        students.map(async (student) => {
          // Update the present status directly
          student.present = present;
          await student.save();
        })
      );
  
      res.json({ message: 'Attendance updated successfully' });
    } catch (error) {
      console.error('Error updating all students:', error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  },

  delete: async (req, res) => {
    const { date, classs, timeSlot } = req.body;
    console.log("brbr"+date, classs, timeSlot);
    try {
const mainDate = date.split('/').reverse().join('-');
      

const dt = new Date(mainDate);
dt.setUTCHours(0,0,0,0);
console.log(dt);

const classFilter = { name: classs };
const classData = await Class.findOne(classFilter, { students: 1 }).lean();

if (!classData) {
  console.log('Class not found');
  return; // Or handle the error appropriately
}
const studentIds = classData.students;
// console.log(studentIds);


let filter = { date: dt };

// Add timeSlot to filter if it's not "All Time Slots"
if (timeSlot !== "All Time Slots") {
  filter.timeSlot = timeSlot;
}
console.log(filter);
// Find student attendance records that match the filter
// const students = await StudentAttendance.find({ studentId: { $in: studentIds }, ...filter });
// console.log(students);

// Delete the matching attendance records
const deleteResult = await StudentAttendance.deleteMany({ studentId: { $in: studentIds }, ...filter });
console.log(`${deleteResult.deletedCount} attendance records deleted.`);

  // console.log(students+" ::: Deleted");
      res.json({ message: 'Attendance deleted successfully' }).status(200);
    } catch (error) {
      console.error('Error deleting attendance:', error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }
  
  

}

module.exports = attendanceControllers;