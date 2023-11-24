const express = require('express');
const app = express()
const cors = require('cors');
const jwt = require('jsonwebtoken')
require('dotenv').config()
const port = process.env.PORT || 5000;


// middleware 
app.use(cors())
app.use(express.json())


// db connect 


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hoyasjp.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    const surveyCollections = client.db("surveyDB").collection("survey")
    const usersCollections = client.db("surveyDB").collection("users")

    // jwt create 
    app.post('/jwt',async(req,res)=>{
      const user =req.body
      const token = jwt.sign(user,process.env.ACCESS_TOKEN,{expiresIn:"1h"})
      res.send({token})
    })


    app.get('/users', async (req, res) => {
      const result = await usersCollections.find().toArray()
      res.send(result);
    })

    app.post('/users', async (req, res) => {
      const user = req.body;
      // inserted users in bd who are log in with google (using checking process)
      const query = { email: user.email }
      const existingEmail = await usersCollections.findOne(query)
      if (existingEmail) {
        return res.send({ message: 'User Already Exist', insertedId: null })
      }
      const result = await usersCollections.insertOne(user)
      res.send(result)
    })



    app.get('/users/admin/:email', async (req, res) => {
      const adminEmail = req.params.email
      if (adminEmail !== req.decoded.email) {
          return res.status(403).send({ message: 'forbidden access' })
      }
      const query = { email: adminEmail };
      const user = await usersCollections.findOne(query)
      let admin = false
      if (user) {
        admin = user?.role === 'admin';
      }
      res.send({ admin })
    })

    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id
      const filter = { _id: new ObjectId(id) }
      const update = {
        $set: {
          role: 'admin',
          // role:'surveyor'
        }
      }
      const result = await usersCollections.updateOne(filter, update)
      res.send(result)
    })

    app.delete('/users/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await usersCollections.deleteOne(query)
      res.send(result)
    })





    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('Online Polling and Survey....')
})

app.listen(port, () => {
  console.log(`Online polling and survey app running on port ${port}`);
})