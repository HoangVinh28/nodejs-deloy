const yup = require("yup");
const express = require("express");
const router = express.Router();
const passport = require("passport");

const {
  validateSchema,
  loginProductSchema,
} = require("../validation/employee");
const { Product } = require("../models/index");
const ObjectId = require("mongodb").ObjectId;
const { CONNECTION_STRING } = require("../constants/dbSettings");
const { default: mongoose } = require("mongoose");

const encodeToken = require("../helpers/productHelper");

mongoose.set("strictQuery", false);
mongoose.connect(CONNECTION_STRING);

/* const { write } = require('../helpers/FileHelper');
let data = require('../data/products.json');

const fileName = './data/products.json'; */

// Methods: POST / PATCH / GET / DELETE / PUT

// ------------------------------------------------------------------------------------------------
// Get all
/* router.get('/', function (req, res, next) {
  res.send(data);
}); */
router.get("/", async (req, res, next) => {
  try {
    let results = await Product.find()
      .populate("category")
      .populate("supplier")
      .lean({ virtual: true });
    res.json(results);
  } catch (error) {
    res.status(500).json({ ok: false, error });
  }
});

router.get("/:id", function (req, res, next) {
  // Validate
  const validationSchema = yup.object().shape({
    params: yup.object({
      id: yup.number(),
    }),
  });

  validationSchema
    .validate({ params: req.params }, { abortEarly: false })
    .then(() => {
      const id = req.params.id;

      let found = data.find((x) => x.id == id);

      if (found) {
        return res.send({ ok: true, result: found });
      }

      return res.send({ ok: false, message: "Object not found" });
    })
    .catch((err) => {
      return res.status(400).json({
        type: err.name,
        errors: err.errors,
        message: err.message,
        provider: "yup",
      });
    });
});

//POST TOKEN LOGIN ID
router.post(
  "/login/:id",
  validateSchema(loginProductSchema),
  async (req, res, next) => {
    try {
      const { _id } = req.body;
      const product = await Product.findById({ _id });

      console.log(product);

      if (!product) return res.status(404).send("khong tim thay");

      const token = encodeToken(product._id, product.name, product.price);

      res.send({
        token,
        payload: product,
      });
    } catch {
      res.send("error");
    }
  }
);

//GET TOKEN PROFILE
router.get(
  "/profile/:id",
  passport.authenticate("jwt", { session: false }),
  async (req, res, next) => {
    try {
      const product = await Product.findById(req.user._id);

      if (!product) return res.status(404).send({ message: "Not found" });

      res.status(200).json(product);
    } catch (err) {
      res.sendStatus(500);
    }
  }
);

// ------------------------------------------------------------------------------------------------
// Create new data
/* router.post('/', function (req, res, next) {
  // Validate
  const validationSchema = yup.object({
    body: yup.object({
      name: yup.string().required(),
      price: yup.number().positive().required(),
      discount: yup.number().positive().max(50).required(),
    }),
  });

  validationSchema
    .validate({ body: req.body }, { abortEarly: false })
    .then(() => {
      const newItem = req.body;

      // Get max id
      let max = 0;
      data.forEach((item) => {
        if (max < item.id) {
          max = item.id;
        }
      });

      newItem.id = max + 1;

      data.push(newItem);

      // Write data to file
      write(fileName, data);

      res.send({ ok: true, message: 'Created' });
    })
    .catch((err) => {
      return res.status(400).json({ type: err.name, errors: err.errors, message: err.message, provider: 'yup' });
    });
}); */

router.post("/", function (req, res, next) {
  // Validate
  const validationSchema = yup.object({
    body: yup.object({
      name: yup.string().required(),
      price: yup.number().positive().required(),
      discount: yup.number().positive().max(50).required(),
      categoryId: yup
        .string()
        .required()
        .test("Validate ObjectID", "${path} is not valid ObjectID", (value) => {
          return ObjectId.isValid(value);
        }),
      supplierId: yup
        .string()
        .required()
        .test("Validate ObjectID", "${path} is not valid ObjectID", (value) => {
          return ObjectId.isValid(value);
        }),
      description: yup.string(),
    }),
  });

  validationSchema
    .validate({ body: req.body }, { abortEarly: false })
    .then(async () => {
      const data = req.body;
      let newItem = new Product(data);
      await newItem.save();
      res.send({ ok: true, message: "Created", result: newItem });
    })
    .catch((err) => {
      return res.status(400).json({
        type: err.name,
        errors: err.errors,
        message: err.message,
        provider: "yup",
      });
    });
});

// ------------------------------------------------------------------------------------------------
// Delete data
/* router.delete("/:id", function (req, res, next) {
  const id = req.params.id;
  data = data.filter((x) => x.id != id);

  res.send({ ok: true, message: "Deleted" });
}); */
//patch data
/* router.patch("/:id", function (req, res, next) {
  const id = req.params.id;
  const patchData = req.body;

  let found = data.find((x) => x.id == id);

  if (found) {
    for (let propertyName in patchData) {
      found[propertyName] = patchData[propertyName];
    }
  }
  write(fileName, data);
  res.send({ ok: true, message: "Updated" });
}); */
router.delete("/:id", function (req, res, next) {
  const validationSchema = yup.object().shape({
    params: yup.object({
      id: yup
        .string()
        .test("Validate ObjectID", "${path} is not valid ObjectID", (value) => {
          return ObjectId.isValid(value);
        }),
    }),
  });

  validationSchema
    .validate({ params: req.params }, { abortEarly: false })
    .then(async () => {
      try {
        const id = req.params.id;

        let found = await Product.findByIdAndDelete(id);

        if (found) {
          return res.send({ ok: true, result: found });
        }

        return res.status(410).send({ ok: false, message: "Object not found" });
      } catch (err) {
        return res.status(500).json({ error: err });
      }
    })
    .catch((err) => {
      return res.status(400).json({
        type: err.name,
        errors: err.errors,
        message: err.message,
        provider: "yup",
      });
    });
});

router.patch("/:id", async function (req, res, next) {
  try {
    const id = req.params.id;
    const data = req.body;
    await Product.findByIdAndUpdate(id, data);
    res.send({ ok: true, message: "Updated" });
  } catch (error) {
    res.status(500).send({ ok: false, error });
  }
});
module.exports = router;
