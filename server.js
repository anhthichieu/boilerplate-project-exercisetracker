import express from 'express'
const app = express()
import cors from 'cors'
import 'dotenv/config'
import mongooseModules from 'mongoose';
const { Schema, connect, model, Types } = mongooseModules;

app.use(cors());

app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(process.cwd() + '/views/index.html')
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

/** Connect to MoongoDB **/
import dotenv from 'dotenv'
dotenv.config() // Load .env file
const mongoURI = process.env.MONGO_URI;
const connectOptions = {
  keepAlive: true,
  useNewUrlParser: true,
  useUnifiedTopology: true
};

connect(mongoURI, connectOptions, (err, db) => {
  if (err) console.log(`Error`, err);
  console.log(`Connected to MongoDB`);
});

// Create Schema and Model for Exercise
const exerciseSchema = new Schema({
  refID: String, // lay _id cua User va gan cho Exersice
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, default: new Date() },
});

const Exercises = model("Exercises", exerciseSchema);

// Create Schema and Model for User
const userSchema = new Schema({
  username: String,
});
const Users = model("Users", userSchema);

/**  Use body-parser to Parse POST Requests */
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.all("/api/users", async (req, res) => {
  /** POST new user */
  if (req.method === "POST") {
    const { username } = req.body;
    // Check if the user is already in the database
    let currentUser = await Users.findOne({ username: username }).exec();

    if (!currentUser) {
      // If the query returns null then add a new instance to database
      currentUser = new Users({
        username: username,
      });
      currentUser.save(function(err, userName) {
        if (err) return console.log(err);
      });
    }

    res.json({
      username: currentUser.username,
      _id: currentUser['_id']
    });
  } else if (req.method === "GET") {
    /** GET all users*/
    const allDocuments = await Users.find({}).exec();
    res.json(allDocuments);
  }
});

/** POST exercise to user */
app.post("/api/users/:_id/exercises", async function (req, res) {
  let { description, duration, date } = req.body;
  const { _id } = req.params;
  date = (!date) ? new Date() : new Date(date);

  if (!description) {
    res.send('Path `description` is required.');
    return;
  }

  if (!duration) {
    res.send('Path `duration` is required.');
    return;
  }

  Users.findById(Types.ObjectId(_id), (err, user) => {
    if (err) return res.status(400).send(err.toString());	
    if (!user) {	
      return res.send("Unknown userId");	
    } else {	
      // Create new exercise instance from user input
      const exercise = new Exercises({
        refID: _id,	
        description: description,	
        duration: duration,	
        date: date	
      });	
      exercise.save((err, data) => {	
        if (err) return res.status(400).send(err.toString());	
        res.status(200).json({	
          _id: user._id,	
          username: user.username,	
          date: data.date.toDateString(),	
          description: data.description,	
          duration: data.duration	
        });	
      });	
    }	
  });
});

/** GET exercise log */
app.get("/api/users/:_id/logs", async function (req, res) {
  const { _id } = req.params;
  let { from, to, limit } = req.query;
  limit = parseInt(limit);

  Users.findById(Types.ObjectId(_id), async (err, user) => {
    if (err) return res.status(400).send(err.toString());
    if (!user) return res.send('Unknown userId');

    let exerciseQuery = { refID: _id };
    if (from && to) {
      exerciseQuery.date = {
        $gte: new Date(from),
        $lte: new Date(to),
      }
    } else if (from) {
      exerciseQuery.date = { $gte: new Date(from)}
    } else if (to) {
      exerciseQuery.date = { $gte: new Date(to)}
    }
   
    Exercises.find(exerciseQuery, '-_id -refID -__v', (err, found) => {
      if (err) return res.status(400).send(err.toString());
      let tempLog = found;
      if (limit) tempLog = tempLog.slice(0, limit);

      let log = [];
      tempLog.map(element => {
        log.push({
          description: element.description,
          duration: element.duration,
          date: element.date.toDateString()
        });
      })

      const count = log.length;
      res.json({
        _id: user._id,
        username: user.username,
        count: count,
        log: log
      });
    });
  })
});