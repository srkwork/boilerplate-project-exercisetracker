const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const shortid = require('shortid');

require('dotenv').config();

//* Middleware

app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

//* MongoDB

mongoose.connect(process.env.MONGO_URI, {
	useNewUrlParser: true,
	useUnifiedTopology: true,
});

//* Schemas

const exerciseSchema = new mongoose.Schema({
	userId: String,
	username: String,
	description: { type: String, required: true },
	duration: { type: Number, required: true },
	date: {type: Date, required: true}
});

const userSchema = new mongoose.Schema({
	username: String,
});

//* Models

let User = mongoose.model('User', userSchema);

let Exercise = mongoose.model('Exercise', exerciseSchema);

//* Endpoints

/*
 * GET
 * Delete all users
 */
app.get('/api/users/delete', function (_req, res) {
	console.log('### delete all users ###'.toLocaleUpperCase());

	User.deleteMany({}, function (err, result) {
		if (err) {
			console.error(err);
			res.json({
				message: 'Deleting all users failed!',
			});
		}

		res.json({ message: 'All users have been deleted!', result: result });
	});
});

/*
 * GET
 * Delete all exercises
 */
app.get('/api/exercises/delete', function (_req, res) {
	console.log('### delete all exercises ###'.toLocaleUpperCase());

	Exercise.deleteMany({}, function (err, result) {
		if (err) {
			console.error(err);
			res.json({
				message: 'Deleting all exercises failed!',
			});
		}

		res.json({ message: 'All exercises have been deleted!', result: result });
	});
});

app.get('/', async (_req, res) => {
	res.sendFile(__dirname + '/views/index.html');
	await User.syncIndexes();
	await Exercise.syncIndexes();
});

/*
 * GET
 * Get all users
 */
app.get('/api/users', async function (_req, res) {
	try{
    const users = await User.find({}, '_id username');
    res.json(users);
  }
  catch (err) {
    console.error(err);
    res.status(500).json({error: 'Error retrieving users'});
  }
});

/*
 * POST
 * Create a new user
 */
app.post('/api/users', async function (req, res) {
	const inputUsername = req.body.username;

	console.log('### create a new user ###'.toLocaleUpperCase());

	//? Create a new user
	try{
    const newUser = new User({username: inputUsername});
    const user = await newUser.save();
    console.log("Creating a new user with username - ".toLocaleUpperCase() + inputUsername);
    res.json({username: user.username, _id: user._id});
  }catch(err){
    console.error(err);
    res.status(500).json({error: "User creation failed"})
  }
});

/*
 * POST
 * Add a new exercise
 * @param _id
 */
app.post('/api/users/:_id/exercises', async function (req, res) {
	const userId = req.params._id;
  const {description, duration, date} = req.body;

  console.log('### add a new exercise ###'.toLocaleUpperCase());

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({error: 'User not found'});
    }
    const exerciseDate = date ? new Date(date) : new Date();
    
    const newExercise = new Exercise({
      userId: user._id,
      username: user.username,
      description: description,
      duration: parseInt(duration, 10), 
      date: exerciseDate
    });
    const savedExercise = await newExercise.save();

    res.json({
      _id: user._id,  
      username: user.username,
      description: savedExercise.description,
      duration: savedExercise.duration,
      date: savedExercise.date.toDateString()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({error: 'Error adding exercise'});
  }
});

/*
 * GET
 * Get a user's exercise log
 * @param _id
 */
app.get('/api/users/:_id/logs', async function (req, res) {
  const {from, to, limit} = req.query;
  const userId = req.params._id;
   
  try{
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({error: 'User not found'});
    }
    const dateFilter = {};
    if (from) {
      dateFilter.$gte = new Date(from);
    }
    if (to) {
      dateFilter.$lte = new Date(to);
    }

    const filter = {
      userId: user._id,
      ...(Object.keys(dateFilter).length > 0 && {date: dateFilter})
    };

    let query = Exercise.find(filter)
      .select('-_id -userId -__v')
      .sort({date: 1});

    if (limit) {
      query = query.limit(parseInt(limit));
    } 
    const exercises = await query.exec();

    const formattedLogs = exercises.map(exercise => ({
      description: exercise.description,
      duration: exercise.duration,
      date: new Date(exercise.date).toDateString()
    }));

    res.json({
      username: user.username,
      count: formattedLogs.length,
      _id: user._id,
      log: formattedLogs
    })
  } catch (err){
    console.error(err);
    res.status(500).json({error: 'Error retrieving user logs'});
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
	console.log('Your app is listening on port ' + listener.address().port);
});
