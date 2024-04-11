const express = require('express');

const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

require('dotenv').config();
const path = require('path');

const connectToMongoDB = require('./mongoConnection');


const classRoutes = require('./routes/classRoutes'); // Import the router module for classes
const facultyRoutes = require('./routes/facultyRoutes');
const studentRoutes = require('./routes/studentRoutes'); // Import the router module for students
const timeSlotRoutes = require('./routes/timeSlotRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');

const authRoutes = require('./routes/authRoutes'); // Adjust the path based on your project structure
const fileUpload = require('express-fileupload');


const app = express();
///////////////////////////////////////////////////////////////////
connectToMongoDB();
///////////////////////////////////////////////////////////////////
const PORT = process.env.PORT || 5000;
///////////////////////////////////////////////////////////////////

// Middleware to parse JSON, URL-encoded data,files and cookies
app.use(fileUpload());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'build')));


////////////////////////////////////////////////////////////////////
app.use('/class', classRoutes);
app.use('/student', studentRoutes);
app.use('/faculty', facultyRoutes);
app.use('/timeSlot', timeSlotRoutes);
app.use('/attendance', attendanceRoutes);

app.use('/auth', authRoutes);

app.get('/*', function (req, res) {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
  });


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});