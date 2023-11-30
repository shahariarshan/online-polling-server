const express = require('express');
const app = express()
const cors = require('cors');
const jwt = require('jsonwebtoken')
require('dotenv').config()
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 5000;


// middleware 
app.use(cors())
app.use(express.json())



let likeCount = 0;
let dislikeCount = 0;
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
    const reviewCollections = client.db('surveyDB').collection('reviews')
    const paymentCollections = client.db('surveyDB').collection('payments')

    // like and dislike count 
    app.get('/api/like/count', (req, res) => {
      res.json({ likeCount });
    });
    
    
    app.post('/api/like', (req, res) => {
      
      likeCount++;
      res.json({ success: true, likeCount });
    });



    app.get('/api/disLike/count', (req, res) => {
      res.json({ dislikeCount });
    });
    
    
    app.post('/api/dislike', (req, res) => {
      dislikeCount;
      res.json({ success: false, dislikeCount });
    });
    



    // jwt create 
    app.post('/jwt', async (req, res) => {
      const user = req.body
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: "1h" })
      res.send({ token })
    })


    app.post('/api/like', (req, res) => {
      likeCount++;

      res.json({ likes: likeCount });
    });

    // Increment Dislike count
    app.post('/api/dislike', (req, res) => {
      dislikeCount++;

      res.json({ dislikes: dislikeCount });
    });

    // middlewears 
    const verifyToken = (req, res, next) => {
      console.log('inside verify token', req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' });
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
      })
    }

    // use verify admin after verifyToken
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollections.findOne(query);
      const isAdmin = user?.role === 'admin';
      if (!isAdmin) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      next();
    }
    const verifySurveyor = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollections.findOne(query);
      const isAdmin = user?.role === 'isSurveyor';
      if (!isSurveyor) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      next();
    }



    app.get('/survey', async (req, res) => {
      const result = await surveyCollections.find().toArray()
      res.send(result)
    })
    app.get('/survey/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await surveyCollections.find(query).toArray()
      res.send(result)
    })

    app.post('/survey', async (req, res) => {
      const survey = req.body
      const result = await surveyCollections.insertOne(survey)
      res.send(result)
    })

    app.delete('/survey/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await surveyCollections.deleteOne(query)
      res.send(result)
    })

    app.patch('/survey/:id', async (req, res) => {
      const item = req.body
      const id = req.params.id
      const filter = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          category: item.category,
          title: item.title,
          expireDate: item.expireDate,
          description: item.description,
          options: item.options
        }
      }
      const result = await surveyCollections.updateOne(filter, updatedDoc)
      res.send(result)
    })


    app.get('/users', async (req, res) => {
      // console.log(req.headers);
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

        }
      }
      const result = await usersCollections.updateOne(filter, update)
      res.send(result)
    })
    // surveyor 

    app.patch('/users/surveyor/:id', async (req, res) => {
      const id = req.params.id
      const filter = { _id: new ObjectId(id) }
      const update = {
        $set: {

          role: 'surveyor'
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

    app.get('/reviews', async (req, res) => {
      const result = await reviewCollections.find().toArray()
      res.send(result)
  })


  app.post('/create-payment-intent', async (req, res) => {
    const { price } = req.body;
    const amount = parseInt(price * 100)
    console.log('amount inside the intent', amount);
    const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']

    })
    res.send({
        clientSecret: paymentIntent.client_secret
    })
})

app.get('/payments/:email', verifyToken, async (req, res) => {
  const query = { email: req.params.email }
  if (req.params.email !== req.decoded.email) {
      return res.status(403).send({ message: 'forbidden access' })
  }
  const result = await paymentCollections.find(query).toArray()
  res.send(result)
})


 app.post('/payments', async (req, res) => {
            const payment = req.body
            const paymentResult = await paymentCollections.insertOne(payment)

          
            console.log('payment info', payment);
          
            res.send({ paymentResult })
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