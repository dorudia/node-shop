const Stripe = require("stripe");
const stripe = Stripe(
  "Ssk_test_51SSXjXCQ28pHn5wnxTLIuMSNjCmCrzg4ow0bgtGNPaSVrdopUU1iX1DG556X0aQLLWrDShWnqLzXOtzZjeBBILdU00oftBRLnS"
); // înlocuiește cu secret key

// exemplu endpoint pentru creare sesiune de checkout
exports.createCheckoutSession = async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Test Product",
            },
            unit_amount: 500, // 5 USD = 500 cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: "http://localhost:3000/success",
      cancel_url: "http://localhost:3000/cancel",
    });
    res.json({ id: session.id });
  } catch (err) {
    console.log(err);
    res.status(500).send("Error creating session");
  }
};
