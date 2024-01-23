import { Express } from "express"
import { readFile, writeFile } from "fs"
import { ReadlineParser, SerialPort } from "serialport"

import { promisify } from "util"
import { SocketController } from "../lib/SocketController"
import Utils from "../lib/Utils"


interface SerialPortFluikaDeviceConnectionDescriptorObject extends SerialPortFluikaDeviceConnectionObject {
    
    
    serialNumber: string;
    
    model: string;
    
    port: SerialPort
    
    parser: any
    
    pressureInMillibars: number
    requestedPressureInMillibars: number
    
    minPressureInMillibars: number
    maxPressureInMillibars: number
    minPressureInPoints: number
    maxPressureInPoints: number
    
    responseHandlers: Function[]
    
    errorMessage: string
    
    errorResponseHandler: (responseData?: any) => (boolean)
    
}


interface SerialPortPressureDeviceConnectionDescriptorObject extends SerialPortFluikaDeviceConnectionObject {
    
    
    serialNumber: string;
    
    model: string;
    
    port: SerialPort
    
    parser: any
    
    minPressureInMillibars: number
    maxPressureInMillibars: number
    minPressureInPoints: number
    maxPressureInPoints: number
    
    responseHandlers: Function[]
    
    pressuresObject: {
        A: number,
        B: number,
        C: number,
        D: number,
        A_r: number,
        B_r: number,
        C_r: number,
        D_r: number,
        multiplier: number
    }
    
    requestedPressuresObject: {
        
        A_r: number,
        B_r: number,
        C_r: number,
        D_r: number
        
    }
    
    errorMessage: string
    
    errorResponseHandler: (responseData?: any) => (boolean)
    
}


function getSet(getFunction?: (self: any) => any, setFunction?: (value: any, self: any) => void) {
    return (target: any, key: string) => {
        let pKey = `_${key}`
        
        let init = function (isGet: boolean) {
            return function (newVal?: any) {
                /*
                 * This is called at runtime, so "this" is the instance.
                 */
                
                // @ts-ignore
                const self = this
                
                // Define hidden property
                Object.defineProperty(self, pKey, { value: 0, enumerable: false, configurable: true, writable: true })
                // Define public property
                Object.defineProperty(self, key, {
                    get: () => {
                        return self[pKey]
                    },
                    set: (val) => {
                        self[pKey] = self[pKey] + 1
                    },
                    enumerable: true,
                    configurable: true
                })
                
                // Perform original action
                if (isGet) {
                    return self[key] // get
                }
                else {
                    self[key] = newVal // set
                }
            }
        }
        
        // Override property to let init occur on first get/set
        return Object.defineProperty(target, key, {
            get: init(true),
            set: init(false),
            enumerable: true,
            configurable: true
        })
    }
}


export class PressureController {
    
    private static _instance: PressureController
    expressApplication: Express
    private connections: SerialPortFluikaDeviceConnectionDescriptorObject[] = []
    private pressureConnection?: SerialPortPressureDeviceConnectionDescriptorObject
    
    @getSet((self) => self._asd)
    asd?: PressureController
    
    private recordingData: {
        
        device: string
        pressureInMillibars: number
        requestedPressureInMillibars: number
        
        errorMessage: string
        
        date: number
        
    }[] = Utils.nil
    
    powerControllerConnection: SerialPort = Utils.nil
    
    
    constructor(expressApplication: Express) {
        
        this.expressApplication = expressApplication
        
        const socketController = SocketController.sharedInstance
        
        // This is for testing
        expressApplication.post("/fit_fun", (request, response) => {
            
            console.log(request)
            
        })
        
        const messageTargets = socketController.messageTargets
        
        messageTargets.StoreData = async (requestObject, socketSession, respondWithMessage) => {
            
            try {
                
                let result = await promisify(writeFile)("PlotterData.json", requestObject.inputData)
                //let result = await needle('post', 'http://localhost:7005/fit_fun', requestObject.inputData, {json: true})
                
                var asd = "" //await promisify(readFile)("PlotterData.json", "utf8")
                
                //console.log(asd)
                
                await respondWithMessage(asd)
                
            } catch (exception) {
                
                respondWithMessage.sendErrorResponse(exception)
                
            }
            
        }
        
        messageTargets.StoredData = async (requestObject, socketSession, respondWithMessage) => {
            
            try {
                
                let result = promisify(readFile)("PlotterData.json", "utf8")
                //let result = await needle('post', 'http://localhost:7005/fit_fun', requestObject.inputData, {json: true})
                
                await respondWithMessage(result)
                
            } catch (exception) {
                
                respondWithMessage.sendErrorResponse(exception)
                
            }
            
        }
        
        
        messageTargets.RecordData = async (requestObject, socketSession, respondWithMessage) => {
            
            try {
                
                this.recordingData = []
                
                
                var asd = "" //await promisify(readFile)("PlotterData.json", "utf8")
                
                //console.log(asd)
                
                await respondWithMessage(asd)
                
            } catch (exception) {
                
                respondWithMessage.sendErrorResponse(exception)
                
            }
            
        }
        
        messageTargets.StopRecordingData = async (requestObject, socketSession, respondWithMessage) => {
            
            try {
                
                if (Utils.IS_NOT(this.recordingData)) {
                    
                    return
                    
                }
                
                
                const result = await promisify(writeFile)(
                    "recordedData/" + requestObject.name + ".json",
                    JSON.stringify(this.recordingData)
                )
                //let result = await needle('post', 'http://localhost:7005/fit_fun', requestObject.inputData, {json: true})
                
                await respondWithMessage("Asdasd")
                
            } catch (exception) {
                
                respondWithMessage.sendErrorResponse(exception)
                
            }
            
        }
        
        
        messageTargets.RetrieveAllDevices = async (requestObject, socketSession, respondWithMessage) => {
            
            try {
                
                const ports: PortInfo[] = await SerialPort.list()
                
                const result = ports.map(port => {
                    
                    let deviceObject: SerialPortDeviceObject = {
                        serialNumber: port.serialNumber || "",
                        port: port,
                        isConnected: false
                    }
                    
                    return deviceObject
                    
                })
                
                await respondWithMessage(result)
                
            } catch (exception) {
                
                respondWithMessage.sendErrorResponse(exception)
                
            }
            
        }
        
        
        messageTargets.RetrieveConnectedFluikaDevices = async (requestObject, socketSession, respondWithMessage) => {
            
            try {
                
                const result = this.connections.filter(value => value.isConnected && value.port.isOpen)
                
                if (this.pressureConnection?.isConnected) {
                    
                    result.push(this.pressureConnection)
                    
                }
                
                await respondWithMessage(result)
                
            } catch (exception) {
                
                respondWithMessage.sendErrorResponse(exception)
                
            }
            
        }
        
        
        messageTargets.RetrieveConnectedPressureDevice = async (requestObject, socketSession, respondWithMessage) => {
            
            try {
                
                await respondWithMessage(this.pressureConnection)
                
            } catch (exception) {
                
                respondWithMessage.sendErrorResponse(exception)
                
            }
            
        }
        
        
        messageTargets.ConnectToFluikaDevices = async (requestObjects, socketSession, respondWithMessage) => {
            
            try {
                
                for (let i = 0; i < requestObjects.length; i++) {
                    
                    const requestObject = requestObjects[i]
                    
                    let existingConnection = this.connections.find(connection => connection.port.path == requestObject.devicePath)
                    
                    if (existingConnection && !existingConnection.port.isOpen) {
                        
                        socketSession.socketClient.DisconnectFromDevice(requestObject)
                        
                    }
                    
                    if (existingConnection) {
                        
                        continue
                        
                    }
                    
                    const port = new SerialPort({ path: requestObject.devicePath, baudRate: 115000 })
                    
                    
                    const parser: ReadlineParser = port.pipe(new ReadlineParser({ delimiter: "\r\n" }))
                    
                    const connectionObject: SerialPortFluikaDeviceConnectionDescriptorObject = {
                        
                        
                        serialNumber: "",
                        model: "",
                        
                        port: port,
                        isConnected: true,
                        parser: parser,
                        pressureInMillibars: 0,
                        requestedPressureInMillibars: 0,
                        
                        maxPressureInMillibars: 0,
                        maxPressureInPoints: 0,
                        minPressureInMillibars: 0,
                        minPressureInPoints: 0,
                        
                        responseHandlers: [],
                        //sentCommands: []
                        
                        errorMessage: "",
                        
                        errorResponseHandler: (responseData?: any) => {
                            
                            const responseDataString: string = responseData?.toString()
                            
                            const isExpectedResponsePattern = responseDataString.contains("ERR")
                            
                            if (isExpectedResponsePattern) {
                                connectionObject.errorMessage = responseDataString
                                return true
                            }
                            
                            return false
                            
                        }
                        
                    }
                    this.connections.push(connectionObject)
                    
                    
                    const serialOnOffTest0021 = "serial on/off test 0021"
                    
                    parser.on("data", (data) => {
                        
                        console.log(data)
                        
                        try {
                            
                            if (data == serialOnOffTest0021) {
                                
                                this.powerControllerConnection = connectionObject.port
                                
                                connectionObject.serialNumber = serialOnOffTest0021
                                
                                //this.connections.removeElement(connectionObject)
                                
                            }
                            
                            const handledResponseHandlers = connectionObject.responseHandlers.filter(
                                responseHandler => responseHandler(data)
                            )
                            
                            if (handledResponseHandlers.length) {
                                
                                handledResponseHandlers.forEach(handledResponseHandler =>
                                    connectionObject.responseHandlers.removeElement(handledResponseHandler)
                                )
                                
                            }
                            
                        } catch (exception) {
                            
                            var asd = 1
                            
                            console.log(exception)
                            
                        }
                        
                        
                    })
                    
                    // if (this.connections.contains(connectionObject)) {
                    //
                    //     return;
                    //
                    // }
                    
                    if (connectionObject.serialNumber != serialOnOffTest0021) {
                        
                        await this.retrieveDeviceInformation(connectionObject)
                        
                        await this.updatePressure(connectionObject)
                        
                    }
                    
                    
                }
                
                const connectionsToRemove = this.connections.filter(
                    connection => requestObjects.noneMatch(
                        requestObject => requestObject.devicePath == connection.port.path
                    )
                )
                
                for (let j = 0; j < connectionsToRemove.length; j++) {
                    
                    const connection = connectionsToRemove[j]
                    
                    socketSession.socketClient.DisconnectFromDevice({ devicePath: connection.port.path })
                    
                }
                
                const connectionObjects = this.connections.map(connection => {
                    
                    const result: SerialPortFluikaDeviceConnectionObject = {
                        
                        maxPressureInMillibars: connection.maxPressureInMillibars,
                        maxPressureInPoints: connection.maxPressureInPoints,
                        minPressureInMillibars: connection.minPressureInMillibars,
                        minPressureInPoints: connection.minPressureInPoints,
                        model: connection.model,
                        pressureInMillibars: connection.pressureInMillibars,
                        requestedPressureInMillibars: connection.requestedPressureInMillibars,
                        
                        isConnected: connection.isConnected,
                        port: { path: connection.port.path, serialNumber: connection.serialNumber },
                        serialNumber: connection.serialNumber
                        
                    }
                    
                    return result
                    
                })
                
                await respondWithMessage(connectionObjects)
                
            } catch (exception) {
                
                respondWithMessage.sendErrorResponse(exception)
                
            }
            
        }
        
        messageTargets.SetPressureOnFluikaDevice = async (requestObject, socketSession, respondWithMessage) => {
            
            try {
                
                const connectionObject = this.connections.find(
                    connectionObject => connectionObject.port.path == requestObject.devicePath
                )
                
                if (!connectionObject) {
                    await respondWithMessage(false)
                    return
                }
                
                connectionObject.requestedPressureInMillibars = requestObject.pressureInMillibars
                
                connectionObject.errorMessage = ""
                connectionObject.responseHandlers.removeElement(connectionObject.errorResponseHandler)
                connectionObject.responseHandlers.push(connectionObject.errorResponseHandler)
                
                const message = "setp " + PressureController.pointsFromPressure(
                    requestObject.pressureInMillibars,
                    connectionObject
                ).integerValue
                
                await PressureController.stringBySendingMessageToConnection(
                    message,
                    new RegExp("SETP"), //new RegExp("\\(\\s*T:\\s*"),
                    connectionObject
                )
                
                await respondWithMessage(true)
                
            } catch (exception) {
                
                console.log(exception)
                //
                // function propsToStr(obj: { [x: string]: string }) {
                //     var str = ""
                //     for (let prop in obj) {
                //         str += prop + "=" + obj[prop] + ","
                //     }
                //     return str
                // }
                //
                // var propertyNames = Object.getOwnPropertyNames(exception)
                // propertyNames.forEach(function (property) {
                //
                //     var descriptor = Object.getOwnPropertyDescriptor(exception, property)
                //     // @ts-ignore
                //     console.log(property + ":" + ex[property] + ":" + propsToStr(descriptor))
                //
                // })
                //
                // console.log(new Error().stack)
                
                respondWithMessage.sendErrorResponse(exception)
                
            }
            
        }
        
        messageTargets.RetrievePressureOnFluikaDevice = async (requestObject, socketSession, respondWithMessage) => {
            
            try {
                
                respondWithMessage.excludeMessageFromAutomaticConnectionEvents()
                
                const connectionObject = this.connections.find(
                    connectionObject => connectionObject.port.path == requestObject.devicePath
                )
                
                if (connectionObject) {
                    
                    await this.updatePressure(connectionObject)
                    
                }
                
                const result = {
                    pressure: connectionObject?.pressureInMillibars ?? 0,
                    errorMessage: connectionObject?.errorMessage ?? ""
                }
                
                
                if (("" + result.errorMessage).contains("4")) {
                    
                    // Stop pumps
                    socketSession.socketClient.StopPower(null)
                    
                }
                
                await respondWithMessage(result)
                
            } catch (exception) {
                
                respondWithMessage.sendErrorResponse(exception)
                
            }
            
        }
        
        
        messageTargets.ConnectToPressureDevice = async (requestObject, socketSession, respondWithMessage) => {
            
            try {
                
                if (this.pressureConnection) {
                    return
                }
                
                
                const port = new SerialPort({ path: requestObject.devicePath, baudRate: 115200 })
                
                const parser: ReadlineParser = port.pipe(
                    //new Delimiter({ delimiter: "}", includeDelimiter: true })
                    new ReadlineParser({ delimiter: "\n" })
                )
                
                const connectionObject: SerialPortPressureDeviceConnectionDescriptorObject = {
                    
                    
                    serialNumber: "1",
                    model: "MATTERPressureController",
                    
                    port: port,
                    isConnected: true,
                    parser: parser,
                    pressureInMillibars: 0,
                    requestedPressureInMillibars: 0,
                    
                    maxPressureInMillibars: 1000,
                    maxPressureInPoints: 65535,
                    minPressureInMillibars: -1000,
                    minPressureInPoints: 0,
                    
                    responseHandlers: [
                        (responseData?: any) => {
                            
                            const responseDataString: string = responseData?.toString()
                            
                            console.log(responseDataString)
                            
                            let responseObject: any
                            try {
                                responseObject = JSON.parse(responseDataString)
                            } catch (exception) {
                                //console.log(exception)
                            }
                            
                            if (!responseObject || !this.pressureConnection) {
                                return false
                            }
                            
                            this.pressureConnection.pressuresObject = responseObject
                            
                            // Return false to prevent deletion of response handler
                            return false
                            
                        }
                    ],
                    //sentCommands: []
                    
                    pressuresObject: Utils.nil,
                    requestedPressuresObject: Utils.nil,
                    
                    errorMessage: "",
                    
                    errorResponseHandler: (responseData?: any) => {
                        
                        const responseDataString: string = responseData?.toString()
                        
                        const isExpectedResponsePattern = responseDataString.contains("ERR")
                        
                        if (isExpectedResponsePattern) {
                            connectionObject.errorMessage = responseDataString
                            return true
                        }
                        
                        return false
                        
                    }
                    
                }
                
                this.pressureConnection = connectionObject
                
                
                parser.on("data", (data) => {
                    
                    //console.log(data)
                    
                    try {
                        
                        const handledResponseHandlers = connectionObject.responseHandlers.filter(
                            responseHandler => responseHandler(data)
                        )
                        
                        if (handledResponseHandlers.length) {
                            
                            handledResponseHandlers.forEach(handledResponseHandler =>
                                connectionObject.responseHandlers.removeElement(handledResponseHandler)
                            )
                            
                        }
                        
                    } catch (exception) {
                        
                        var asd = 1
                        
                        console.log(exception)
                        
                    }
                    
                    
                })
                
                
                await respondWithMessage(this.pressureConnection)
                
            } catch (exception) {
                
                respondWithMessage.sendErrorResponse(exception)
                
            }
            
        }
        
        messageTargets.SetPressureOnDeviceAndPort = async (requestObject, socketSession, respondWithMessage) => {
            
            try {
                
                const connectionObject = this.pressureConnection
                
                if (!connectionObject) {
                    await respondWithMessage(false)
                    return
                }
                
                connectionObject.requestedPressureInMillibars = requestObject.pressureInMillibars
                
                connectionObject.errorMessage = ""
                connectionObject.responseHandlers.removeElement(connectionObject.errorResponseHandler)
                connectionObject.responseHandlers.push(connectionObject.errorResponseHandler)
                
                
                const maxPressureInPoints = connectionObject.maxPressureInPoints ?? 1
                const minPressureInPoints = connectionObject.minPressureInPoints ?? 0
                const maxPressureInMillibars = connectionObject.maxPressureInMillibars ?? 1
                const minPressureInMillibars = connectionObject.minPressureInMillibars ?? 0
                const maxVoltage = 5.0
                
                const pressureInPoints = (
                    (requestObject.pressureInMillibars - minPressureInMillibars) /
                    (maxPressureInMillibars - minPressureInMillibars)
                )   * maxPressureInPoints // / connectionObject.pressuresObject.multiplier
                
                const message = "" + [
                    [pressureInPoints.integerValue, minPressureInPoints].max(),
                    maxPressureInPoints
                ].min().integerValue + requestObject.port + "\n"
                
                await PressureController.stringBySendingMessageToConnection(
                    message,
                    new RegExp("Command"), //new RegExp("\\(\\s*T:\\s*"),
                    connectionObject
                )
                
                await respondWithMessage(true)
                
            } catch (exception) {
                
                console.log(exception)
                //
                // function propsToStr(obj: { [x: string]: string }) {
                //     var str = ""
                //     for (let prop in obj) {
                //         str += prop + "=" + obj[prop] + ","
                //     }
                //     return str
                // }
                //
                // var propertyNames = Object.getOwnPropertyNames(exception)
                // propertyNames.forEach(function (property) {
                //
                //     var descriptor = Object.getOwnPropertyDescriptor(exception, property)
                //     // @ts-ignore
                //     console.log(property + ":" + ex[property] + ":" + propsToStr(descriptor))
                //
                // })
                //
                // console.log(new Error().stack)
                
                respondWithMessage.sendErrorResponse(exception)
                
            }
            
        }
        
        messageTargets.RetrievePressuresOnPressureDevice = async (requestObject, socketSession, respondWithMessage) => {
            
            try {
                
                respondWithMessage.excludeMessageFromAutomaticConnectionEvents()
                
                const connectionObject = this.pressureConnection
                
                if (!connectionObject) {
                    return
                }
                
                const result = {
                    pressuresObject: connectionObject.pressuresObject
                }
                
                await respondWithMessage(result)
                
            } catch (exception) {
                
                respondWithMessage.sendErrorResponse(exception)
                
            }
            
        }
        
        
        messageTargets.DisconnectFromDevice = async (requestObject, socketSession, respondWithMessage) => {
            
            try {
                
                const connectionObject = this.connections.find(
                    connectionObject => connectionObject.port.path == requestObject.devicePath
                )
                
                if (connectionObject) {
                    
                    if (connectionObject.port.isOpen) {
                        
                        connectionObject.port.close()
                        
                    }
                    
                    connectionObject.isConnected = false
                    this.connections.removeElement(connectionObject)
                    
                }
                
                await respondWithMessage(true)
                
            } catch (exception) {
                
                respondWithMessage.sendErrorResponse(exception)
                
            }
            
        }
        
        
        messageTargets.StopPower = async (requestObject, socketSession, respondWithMessage) => {
            
            try {
                
                let result = "OK"
                
                if (Utils.IS(this.powerControllerConnection)) {
                    
                    this.powerControllerConnection.write("on1")
                    
                    
                }
                
                
                //let result = await needle('post', 'http://localhost:7005/fit_fun', requestObject.inputData, {json: true})
                
                await respondWithMessage(result)
                
            } catch (exception) {
                
                respondWithMessage.sendErrorResponse(exception)
                
            }
            
        }
        
        
    }
    
    
    private async retrieveDeviceInformation(
        connectionObject: SerialPortFluikaDeviceConnectionDescriptorObject,
        repeatOnException = true
    ) {
        
        try {
            
            connectionObject.serialNumber = (await PressureController.stringBySendingMessageToConnection(
                "sn",
                new RegExp("\\(\\s*SN:\\s*"),
                connectionObject
            )) || ""
            
            connectionObject.model = (await PressureController.stringBySendingMessageToConnection(
                "dev",
                new RegExp("\\(\\s*DEV:\\s*"),
                connectionObject
            )) || ""
            
            connectionObject.minPressureInMillibars = ((await PressureController.stringBySendingMessageToConnection(
                "gmin p",
                new RegExp("\\(\\s*MIN:\\s*-?\\d*p\\s*\\)"),
                connectionObject
            )) || "").replace("(MIN:", "").replace("p)", "").numericalValue
            
            connectionObject.maxPressureInMillibars = ((await PressureController.stringBySendingMessageToConnection(
                "gmax p",
                new RegExp("\\(\\s*MAX:\\s*-?\\d*p\\s*\\)"),
                connectionObject
            )) || "").replace("(MAX:", "").replace("p)", "").numericalValue
            
            connectionObject.minPressureInPoints = ((await PressureController.stringBySendingMessageToConnection(
                "gmin d",
                new RegExp("\\(\\s*MIN:\\s*-?\\d*d\\s*\\)"),
                connectionObject
            )) || "").replace("(MIN:", "").replace("d)", "").numericalValue
            
            connectionObject.maxPressureInPoints = ((await PressureController.stringBySendingMessageToConnection(
                "gmax d",
                new RegExp("\\(\\s*MAX:\\s*-?\\d*d\\s*\\)"),
                connectionObject
            )) || "").replace("(MAX:", "").replace("d)", "").numericalValue
            
            
        } catch (exception) {
            
            console.log(exception)
            
            if (repeatOnException) {
                
                await this.retrieveDeviceInformation(connectionObject, false)
                
            }
            
        }
        
        
    }
    
    private async updatePressure(connectionObject: SerialPortFluikaDeviceConnectionDescriptorObject) {
        
        try {
            
            
            const response = await PressureController.stringBySendingMessageToConnection(
                "getp",
                new RegExp("\\(\\s*P:\\s*"),
                connectionObject
            )
            const pressureNumber = (response || "").replace(
                "(P:",
                ""
            ).replace(")", "").numericalValue
            const pressure = PressureController.pressureFromPoints(
                pressureNumber,
                connectionObject
            )
            const minPressure = PressureController.pressureFromPoints(
                connectionObject.minPressureInPoints,
                connectionObject
            )
            connectionObject.pressureInMillibars = pressure - minPressure
            
            this.recordingData.push({
                
                device: connectionObject.serialNumber,
                pressureInMillibars: connectionObject.pressureInMillibars,
                requestedPressureInMillibars: connectionObject.requestedPressureInMillibars,
                
                errorMessage: connectionObject.errorMessage,
                
                date: Date.now()
                
            })
            
            var asd = 1
            
            // setTimeout(() => {
            //
            //     if (connectionObject.isConnected) {
            //
            //         PressureController.updatePressure(connectionObject)
            //
            //     }
            //
            // }, 100)
            
        } catch (e) {
            
            var asdasd = 1
            
            console.log(e)
            
        }
        
    }
    
    private static pressureFromPoints(points: number, connectionObject: SerialPortFluikaDeviceConnectionObject) {
        
        const result = ((connectionObject.maxPressureInMillibars - connectionObject.minPressureInMillibars) /
            (connectionObject.maxPressureInPoints - connectionObject.minPressureInPoints)) * points + connectionObject.minPressureInMillibars
        
        return result
        
    }
    
    private static pointsFromPressure(
        pressureInMillibars: number,
        connectionObject: SerialPortFluikaDeviceConnectionObject
    ) {
        
        var maxPressureInPoints = [connectionObject.maxPressureInPoints, connectionObject.minPressureInPoints].max()
        
        var minPressureInPoints = [connectionObject.minPressureInPoints, connectionObject.maxPressureInPoints].min()
        
        var maxPressureInMillibars = [
            connectionObject.maxPressureInMillibars,
            connectionObject.minPressureInMillibars
        ].max()
        
        var minPressureInMillibars = [
            connectionObject.minPressureInMillibars,
            connectionObject.maxPressureInMillibars
        ].min()
        
        
        var result = ((maxPressureInPoints - minPressureInPoints) /
            (maxPressureInMillibars - minPressureInMillibars)) * pressureInMillibars + minPressureInPoints
        
        return result
        
    }
    
    private static stringBySendingMessageToConnection(
        message: string | number[] | Buffer,
        responsePattern: RegExp,
        connectionObject: SerialPortFluikaDeviceConnectionDescriptorObject
    ): Promise<string | undefined> {
        
        const result: Promise<string> = new Promise((resolve, reject) => {
            
            const messageData = message + "\r"
            
            // connectionObject.port.open()
            //
            // if (!connectionObject.port.isOpen) {
            //
            //     reject("Port is closed on connection.")
            //
            //     return
            //
            // }
            
            connectionObject.port.write(messageData, () => {
                
                // console.log("message written")
                // console.log(message)
                
                //connectionObject.sentCommands.push(messageData)
                
                // connectionObject.responseHandlers.push(function (responseData?: any) {
                //
                //
                //
                //     return true
                //
                // })
                
                const responseHandler = (responseData?: any) => {
                    
                    const responseDataString: string = responseData?.toString()
                    
                    const isExpectedResponsePattern = responsePattern.test(responseDataString)
                    
                    if (!isExpectedResponsePattern) {
                        
                        //connectionObject.sentCommands.removeElement(responseDataString)
                        
                        return false
                        
                    }
                    
                    // console.log("\n\nReceived response \n" + responseData + "\nFor message\n" + message + "\n")
                    
                    if (responseDataString != null) {
                        
                        resolve(responseDataString)
                        
                    }
                    else {
                        
                        reject(responseDataString)
                        
                    }
                    
                    return true
                    
                    
                }
                
                responseHandler.pattern = responsePattern
                
                responseHandler.message = message
                
                connectionObject.responseHandlers.push(responseHandler)
                
                setTimeout(() => {
                    
                    reject("Timeout on request " + message + " to port " + connectionObject.port.path)
                    
                }, 1000)
                
            })
            
        })
        
        return result
        
        
    }
    
    public static get sharedInstance() {
        return this._instance
    }
    
    // noinspection TypeScriptUMDGlobal,JSDeprecatedSymbols
    public static Instance(expressApplication: Express) {
        
        return this._instance || (this._instance = new this(expressApplication))
        
    }
    
    
}













