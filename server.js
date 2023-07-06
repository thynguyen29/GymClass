//======= Server setup =======//
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAMu1cm2Y4IHi7GNaJrMaNjXzg1YWEl7sg",
  authDomain: "gymclass-8575d.firebaseapp.com",
  projectId: "gymclass-8575d",
  storageBucket: "gymclass-8575d.appspot.com",
  messagingSenderId: "1014631723994",
  appId: "1:1014631723994:web:d09af011f6ff3177abc6e3",
  measurementId: "G-5Y3H5R74R6"
};




// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

const express = require("express");
const exphbs = require("express-handlebars");
const app = express();
const path = require("path");
const HTTP_PORT = process.env.PORT || 3030;
const mongoose = require("mongoose");
mongoose.connect("mongodb+srv://dbUser:Tiggy2986@cluster0.jstjz5l.mongodb.net/?retryWrites=true&w=majority");

export function handle(req, res) {
  
}


app.set("view engine", ".hbs");
app.use(express.urlencoded({extended: true}));
app.use(express.static("assets"));
app.engine(".hbs", exphbs.engine({
    extname: ".hbs",
    helpers: {
        json: (context) => { return JSON.stringify(context) }
    }
}));

const session = require(`express-session`);
app.use(
  session({
    secret: "the quick brown fox jumped over the lazy dog 1234567890", // random string, used for configuring the session
    resave: false,
    saveUninitialized: true,
  })
);

const onHttpStart = () => {
    console.log(`Server is running on port ${HTTP_PORT}`)
    console.log(`Press CTRL+C to exit`)
}
app.listen(HTTP_PORT, onHttpStart);

//======= Database Definition =======//

//Users Schema
const Schema = mongoose.Schema;
const usersSchema = new Schema({
    username: String, 
    password: String,  
});
const Users = mongoose.model("users_collections", usersSchema);

//Classes Schema
const classesSchema = new Schema({
    image:    String, 
    title:    String, 
    duration: Number,
});
const Classes = mongoose.model("classes_collections", classesSchema);

//Payments Schema
const paymentsSchema = new Schema({
    username: String, 
    total:    Number, 
});
const Payments = mongoose.model("payments_collections", paymentsSchema);

// Cart Schema
const cartSchema = new Schema({
    username: String, 
    id:       String, 
});
const Cart = mongoose.model("cart_collections", cartSchema);



//======= Endpoints =======//

app.get("/", (req, res) => {
  console.log(req.session);
  res.render("login", { 
    layout: "layout", 
    sign: false, 
    log: req.session.signedInUser, 
    exist:false});
});

app.post("/login", async (req, res) => {
  const usernameUI = req.body.user;
  const passwordUI = req.body.pass;
  const optionUI = req.body.option;

  console.log(usernameUI);
  console.log(passwordUI);
  console.log(optionUI);
 
  try{
    const userFromDB = await Users.findOne({ username: usernameUI });
    if (optionUI === "LOGIN") {
      if (userFromDB === null || userFromDB.password !== passwordUI) {
        return res.render("login", { 
          layout: "layout", 
          signUp: false, 
          username: usernameUI, 
          log: false, 
          exist: true });
      }  
    }
    else {
      if (userFromDB != null) {
        req.session.signedInUser = false;
        return res.send(`<p>ERROR: ${usernameUI} already exist</p> <a href="/">Go back</a>`)
      } 
      else {
        return res.render("login", { 
          layout: "layout", 
          signUp: true, 
          username: usernameUI, 
          password: passwordUI });
      }
    }
    req.session.signedInUser = true;
    req.session.username = userFromDB.username;
    const classesList = await Classes.find().lean();
    return res.render("classes", { 
      layout: "layout", 
      classes: classesList, 
      log: true, 
      signUp: false });
  }
  catch (err){
    console.log(err);
  }
}); 

app.post("/registered", async (req, res) => {
  const usernameUI = req.body.username;
  const passwordUI = req.body.password;
  const memOptionUI = req.body.memberOption;
  //const { username: usernameParams, password: passwordParams } = req.params;
  console.log(usernameUI);
  console.log(passwordUI);
  console.log(memOptionUI);

  try {
    if (memOptionUI === "Yes") {
      const createPayment = new Payments({ username: usernameUI, total:75});
      await createPayment.save();
      member = true;
      const createUser = new Users({username: usernameUI, password: passwordUI});
      await createUser.save();
    } 
    else {
      member = false;
      const createUser = new Users({username: usernameUI, password: passwordUI});
      await createUser.save();
    }
    req.session.signedInUser = true;
    req.session.username = usernameUI;
    req.session.isMember = member;

    const classesList = await Classes.find().lean();
    console.log(req.session);
    return res.render("classes", {
      layout: "layout",
      classes: classesList,
      log: req.session.signedInUser,
    });
  } catch (err) {
    console.log(err);
  }
});

app.get("/available-classes", async (req, res) => {
  try {
    const classesList = await Classes.find().lean();

    if (req.session.signedInUser === undefined) {
      return res.render("classes", { layout: "layout", classes: classesList });
    }

    return res.render("classes", {
      layout: "layout",
      classes: classesList,
      log: req.session.signedInUser
    });
  } catch (err) {
    console.log(err);
  }
});

app.post("/book/:id", async (req, res) => {
  const idUI = req.params.id;
  if (req.session.signedInUser === undefined) {
    return res.render("classes", {
      layout: "layout",
      check:true,
    });

  } else {
    try {
      const addCart = new Cart({ username: req.session.username, id: idUI });
      await addCart.save();

      const classesList = await Classes.find().lean();
      notLogin = false;
      return res.render("classes", {
        layout: "layout",
        classes: classesList,
        log: req.session.signedInUser,
        check:false
      });
    } catch (err) {
      console.log(err);
    }
  }

  return;
});

app.get("/cart", async (req, res) => {
  let subtotal = 0.0;
  let tax = 0.0;
  let total = 0.0;
  let member = true;

  if (req.session.signedInUser === undefined) {
    return res.render("cart", {
      layout: "layout",
      log: req.session.signedInUser,
    });
  } else {
    try {
      const cartList = await Cart.find({ username: req.session.username });

      if (cartList.length === 0) {
        return res.render("cart", {
          layout: "layout",
          log: req.session.signedInUser,
          empty: true,
        });
      }

      const payment = await Payments.findOne({
        username: req.session.username,
      });
      const classArray = [];

      for (let i = 0; i < cartList.length; i++) {
        const classes = await Classes.find({ _id: cartList[i].id }).lean();
        classArray.push(classes);
      }
      const classesList = classArray.flat();

      if (!payment || payment.total !== 75) {
        subtotal = 25 * classesList.length;
        tax = subtotal * 0.13;
        total = subtotal + tax;
        member = false;
      }

      return res.render("cart", {
        layout: "layout",
        classes: classesList,
        log: req.session.signedInUser,
        aSubtotal: subtotal.toFixed(2),
        aTax: tax.toFixed(2),
        aTotal: total.toFixed(2),
        isMember: member
      });

    } catch (err) {
      console.log(err);
    }
  }
});

app.post("/remove/:id", async (req, res) => {
  const idUI = req.params.id;

  try {
    await Cart.deleteOne({ username: req.session.username, id: idUI });
    return res.redirect("/cart");
  } 
  catch (err) {
    console.log(err)
  }

});

app.post("/confirm/:total/:member", async (req, res) => {
    const totalUI = parseFloat(req.params.total);
    const memberUI = req.params.member;
    console.log(memberUI)
  
    if(memberUI === "false")
    {
      const createPayment = new Payments({ username:req.session.username , total: totalUI});
      console.log(createPayment);
      await createPayment.save();
    }
      await Cart.deleteMany({ username: req.session.username });
      return res.send(`<p>PAYMENT SUCCESSFUL!</p> <a href="/">Go back</a>`);
});

app.get("/payments", async (req, res) => {
 try {
  const paymentList = await Payments.find().lean();
  for(let i = 0; i < paymentList.length; i++)
  {
    res.send(`All PAYMENTS  ${JSON.stringify(paymentList)}`)
  }
  
 } catch (err) {
  console.log(err)
 }
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  console.log(req.session);
  res.redirect("/");
});

