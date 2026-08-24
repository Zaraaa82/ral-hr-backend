require("dotenv").config({
    path: ".env.test",
});

const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../app");

const User = require("../models/User");


beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
});


afterEach(async () => {
    await User.deleteMany({});
});


afterAll(async () => {
    await mongoose.connection.close();
});


describe("Auth Routes", () => {


    describe("POST /auth/sign-up", () => {


        test("creates a new user", async () => {

            const response = await request(app)
                .post("/auth/sign-up")
                .send({
                    username: "zaid",
                    password: "password123"
                });


            expect(response.statusCode).toBe(201);


            expect(response.body.username)
                .toBe("zaid");


            expect(response.body.hashedPassword)
                .toBeUndefined();

        });



        test("does not allow duplicate usernames return 409", async () => {


            await User.create({
                username: "zaid",
                hashedPassword: "hashedpassword"
            });


            const response = await request(app)
                .post("/auth/sign-up")
                .send({
                    username: "zaid",
                    password: "password123"
                });


            expect(response.statusCode)
                .toBe(409);


            expect(response.body.message)
                .toBe("Username already exists");

        });

        test("does not allow signup when missing username or password", async () => {



            const response = await request(app)
                .post("/auth/sign-up")
                .send({
                    username: "zaid",
                });


            expect(response.statusCode)
                .toBe(400);


            expect(response.body.message)
                .toBeDefined()

        });


    });



    describe("POST /auth/sign-in", () => {


        beforeEach(async () => {

            await User.create({
                username: "zaid",
                hashedPassword: "$2b$12$LQv3c1y8f5k7H5x..."
            });

        });



        test("requires username and password", async () => {


            const response = await request(app)
                .post("/auth/sign-in")
                .send({
                    username: "zaid"
                });


            expect(response.statusCode)
                .toBe(400);


            expect(response.body.message)
                .toBe(
                    "Username and password are required."
                );

        });



        test("rejects invalid username", async () => {


            const response = await request(app)
                .post("/auth/sign-in")
                .send({
                    username: "doesnotexist",
                    password: "password123"
                });


            expect(response.statusCode)
                .toBe(401);


            expect(response.body.message)
                .toBe(
                    "Invalid credentials."
                );

        });



        test("rejects incorrect password", async () => {


            const response = await request(app)
                .post("/auth/sign-in")
                .send({
                    username: "zaid",
                    password: "wrongpassword"
                });


            expect(response.statusCode)
                .toBe(401);


            expect(response.body.message)
                .toBe(
                    "Invalid credentials."
                );

        });



    });


});