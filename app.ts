import * as path from "path"
import "./lib/Extensions"
import express from "express"
import { SocketController } from "./lib/SocketController"
import { PressureController } from "./src/PressureController"
import SocketIO = require("socket.io")
import formData from "express-form-data"
import { rename } from "fs"
import { promisify } from "util"
var openBrowsers = require('open-browsers');


var expressApplication = express()

expressApplication.use(express.json())

expressApplication.use(formData.parse())

//expressApp.set('view engine', 'ejs');// tell Express we're using EJS
expressApplication.set("views", path.join(__dirname + "/webclient"))// set path to *.ejs files

expressApplication.get("/", (request, response) => {
    
    response.sendFile(__dirname + "/webclient/Test.html")
    
})

expressApplication.get("/frontpage.html", (request, response) => {
    
    response.sendFile(__dirname + "/webclient/Frontpage.html")
    
})

expressApplication.get("/styles.css", (request, response) => {
    
    response.sendFile(__dirname + "/webclient/styles.css")
    
})
expressApplication.get("/compiledScripts/:filename", (request, response) => {
    
    response.sendFile(__dirname + "/webclient/compiledScripts/" + request.params.filename)
    
})
expressApplication.get("/compiledScripts/hjson-js-master/bundle/:filename", (request, response) => {
    
    response.sendFile(__dirname + "/webclient/compiledScripts/hjson-js-master/bundle/" + request.params.filename)
    
})
expressApplication.get("/compiledScripts/ckeditor5-31/build/:filename", (request, response) => {
    
    response.sendFile(__dirname + "/webclient/compiledScripts/ckeditor5-31/build/" + request.params.filename)
    
})


expressApplication.get("/images/:filename", (request, response) => {
    
    response.sendFile(__dirname + "/webclient/images/" + request.params.filename)
    
})

expressApplication.get("/uploadedfiles/:filename", (request, response) => {
    
    response.sendFile(__dirname + "/uploadedfiles/" + request.params.filename)
    
})


expressApplication.post("/imageupload", async (request, response) => {
    
    console.log(request.body)
    // @ts-ignore
    console.log(request.files)
    console.log(request.headers)
    
    // @ts-ignore
    const pathString = request.files.images.path as string
    const newPathString = path.join("uploadedfiles", path.basename(pathString))
    
    var asd = await promisify(rename)(pathString, newPathString)
    
    response.send({ msg: "File was uploaded", error: 0, images: [newPathString] })
    
})

let server = expressApplication.listen(7005)

const socketIO = SocketIO(server, { cookie: false, pingTimeout: 30000 })

SocketController.Instance(socketIO)

let asd = PressureController.Instance(expressApplication)

let targetURL = "http://localhost:7005"
// var url = 'http://localhost:7005';
// var start = (process.platform == 'darwin'? 'open': process.platform == 'win32'? 'start': 'xdg-open');
// require('child_process').exec(start + ' ' + url);
// opener(targetURL)

if (openBrowsers(targetURL)) {
    console.log('The browser tab has been opened!');
}

const asdasd = 1













