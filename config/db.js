const mongoose = require("mongoose")

async function connectToDB(){ //connection to the database
    try{
        const connection = await mongoose.connect(process.env.MONGODB_URI)
        console.log(`Connected to Database: ${connection.connection.name}`);
    }
    catch(error){
        console.log("Error Occured",error)
    }
}

module.exports = connectToDB