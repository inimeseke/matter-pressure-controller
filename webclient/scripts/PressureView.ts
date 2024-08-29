/// <reference path="./UICore/UIViewController.ts" />
///<reference path="UICore/UITextView.ts"/>
///<reference path="Custom components/CBButton.ts"/>
///<reference path="UICore/UITextArea.ts"/>


//InlineEditor = CKSource.Editor


interface PressureCalibrationMeasurementObject {
    requestedMillibars: number;
    port: "A" | "B" | "C" | "D";
    devicePath: any;
    measuredPressures: number[];
    averageMillibarsMeasured: number
}


interface StatisticsObject {
    
    A: StatisticsPortObject[]
    B: StatisticsPortObject[]
    C: StatisticsPortObject[]
    D: StatisticsPortObject[]
    
}


interface StatisticsPortObject {
    
    startingPressure: number
    targetPressure: number
    valueReached: number
    timeTaken: number
    currentTime: number
    
}


interface PVPoint {
    x: number;
    y: number;
}


class PressureView extends UIView {
    
    inputTextArea: UITextArea
    
    // chartView: UIView
    // chart: any
    // resultsLabel: UIView
    
    previousWidth: number
    
    private readonly deviceLabel: UITextView
    private readonly pressureTargetView: EnterNumericalValueView
    
    private readonly pressureLabel: UITextView
    private isUpdatingPressureScheduled: boolean
    
    private readonly zeroingButton: CBButton
    private readonly informationLabel: UITextView
    
    private readonly zeroADCOffsetCalibrationButton: CBButton
    private readonly scanCalibrationButton: CBButton
    
    private readonly calibrationChartButton: CBButton
    
    private _descriptorObject: PressureDescriptorObject
    private _lastSentRequestMillibars: number
    private _currentTarget: number
    
    chartView: UIView
    chart: any
    private requestSendTime: number
    private pressureDuringTargetChange: number
    private recordPressureReachingTime: boolean
    slidingWindows: { time: number, pressureValue: number }[][] = []
    slidingWindowLengthInSeconds = 5
    slidingWindowChunkLengthInSeconds = 1
    
    set descriptorObject(descriptorObject: PressureDescriptorObject) {
        
        this._descriptorObject = descriptorObject
        this.inputTextArea.innerHTML = descriptorObject.inputString
        
        // @ts-ignore
        let model = wrapInNil(descriptorObject).deviceObject.model
        
        this.deviceLabel.text = //FIRST(model, "No model") + " " +
            descriptorObject.portString
        
        this.setInputTextIfNeeded(descriptorObject)
        
        if (this.deviceLabel.text.contains(serialOnOffTest0021)) {
            this.userInteractionEnabled = NO
            this.alpha = 0.5
        }
        
        this.pressureTargetView.numericalValue = descriptorObject.pressureValue || 0
        this.deviceObject = descriptorObject.deviceObject || nil
        
    }
    
    get descriptorObject() {
        
        let objectValue: PressureDescriptorObject = {
            
            identifier: this._descriptorObject.identifier || MAKE_ID(),
            
            viewType: PressureView.name,
            inputString: FIRST(this.inputTextArea.text, this.inputTextArea.innerHTML),
            //devicePath: this.deviceTextField.text,
            pressureValue: this.pressureTargetView.numericalValue,
            
            model: undefined,
            portString: this.port,
            
            date: FIRST(
                FIRST_OR_NIL(this._descriptorObject).date,
                FIRST_OR_NIL(this._descriptorObject).updateDate,
                null
            ),
            updateDate: FIRST(FIRST_OR_NIL(this._descriptorObject).updateDate, null)
            
        }
        
        this._descriptorObject = objectValue
        return this._descriptorObject
        
    }
    
    private _deviceObject: SerialPortPressureDeviceConnectionObject
    set deviceObject(deviceObject: SerialPortPressureDeviceConnectionObject) {
        this._deviceObject = deviceObject
        
        // Ask server about the pressure
        this.updatePressure().then(nil)
    }
    
    get deviceObject() {
        return this._deviceObject
    }
    
    get port(): "A" | "B" | "C" | "D" {
        return this._descriptorObject.portString
    }
    
    set calibrationValues(value: PressureCalibrationMeasurementObject[]) {
        localStorage.setItem("_calibrationValues_" + this.port, JSON.stringify(value))
    }
    
    get calibrationValues(): PressureCalibrationMeasurementObject[] | undefined {
        return JSON.parse(localStorage.getItem("_calibrationValues_" + this.port) ?? "[]")
    }
    
    get calibrationPoints(): PVPoint[] {
        return this.calibrationValues.map(value => {
            
            // X and Y are flipped here on purpose to make interpolation easier
            return {
                y: value.requestedMillibars,
                x: value.averageMillibarsMeasured //+ this.zeroADCOffset
            }
            
        })
    }
    
    set zeroADCOffsetObject(value: PressureCalibrationMeasurementObject) {
        localStorage.setItem("_zeroADCOffsetObject_" + this.port, JSON.stringify(value))
    }
    
    get zeroADCOffsetObject(): PressureCalibrationMeasurementObject | undefined {
        return JSON.parse(localStorage.getItem("_zeroADCOffsetObject_" + this.port))
    }
    
    get zeroADCOffset(): number {
        const zeroADCOffsetObject = this.zeroADCOffsetObject
        return (zeroADCOffsetObject?.requestedMillibars ?? 0) - (zeroADCOffsetObject?.averageMillibarsMeasured ?? 0)
    }
    
    set zeroingFactor(value: number) {
        localStorage.setItem("_zeroingFactor_" + this.port, "" + value)
    }
    
    get zeroingFactor(): number | undefined {
        return (localStorage.getItem("_zeroingFactor_" + this.port) ?? "0").numericalValue
    }
    
    constructor(elementID?: string) {
        
        // Calling super
        super(elementID)
        
        // Code for further setup if necessary
        
        //this.backgroundColor = UIColor.colorWithRGBA(251, 251, 251)
        
        this.inputTextArea = new UITextArea(this.elementID + "InputTextArea")
        this.inputTextArea.changesOften = YES
        this.inputTextArea.style.fontWeight = "bold"
        this.inputTextArea.textAlignment = UITextView.textAlignment.center
        this.addSubview(this.inputTextArea)
        
        // @ts-ignore
        const imgLoad = imagesLoaded(this.viewHTMLElement)
        const imagesDidLoad = (instance => {
            console.log("ALWAYS - all images have been loaded")
            this.setNeedsLayoutUpToRootView()
            imgLoad.off("always", imagesDidLoad)
        })
        imgLoad.on("always", imagesDidLoad)
        
        this.inputTextArea.style.overflow = "hidden"
        this.inputTextArea.style.overflowWrap = "anywhere"
        this.inputTextArea.style.whiteSpace = "pre-wrap"
        
        this.deviceLabel = new UITextView(this.elementID + "DeviceLabel")
        this.deviceLabel.textAlignment = UITextField.textAlignment.center
        this.deviceLabel.alpha = 0.5
        this.addSubview(this.deviceLabel)
        
        this.pressureLabel = new UITextView(this.elementID + "PressureLabel")
        this.pressureLabel.textSuffix = " mbar"
        this.pressureLabel.text = "0".bold()
        this.pressureLabel.textColor = UIColor.redColor
        this.pressureLabel.textAlignment = UITextField.textAlignment.center
        this.addSubview(this.pressureLabel)
        
        this.pressureTargetView = new EnterNumericalValueView()
        this.pressureTargetView.textField.addControlEventTarget.TextChange.Blur.EnterDown = async (sender, event) => {
            
            //console.log(sender)
            function eventKeyIsEnter(event) {
                if (event.keyCode !== 13) {
                    return NO
                }
                return YES
            }
            
            const isTextFieldFocused = this.pressureTargetView.textField.viewHTMLElement == document.activeElement
            
            // If the event is nil, then the event is from + or - buttons
            if (isTextFieldFocused && event instanceof KeyboardEvent && !eventKeyIsEnter(event)) {
                return
            }
            
            if (IS(this.deviceObject) && !isNaN(this.pressureTargetView.integerValue)) {
                
                let pressureInMillibars = this.pressureTargetView.integerValue + this.zeroingFactor
                
                const achievablePressureInMillibars = [
                    [
                        pressureInMillibars,
                        this.minAchievablePressureInMillibars
                    ].max(),
                    this.maxAchievablePressureInMillibars
                ].min()
                
                if (achievablePressureInMillibars != pressureInMillibars) {
                    
                    this.pressureTargetView.textField.backgroundColor = UIColor.redColor
                    
                    return
                    
                }
                
                this.pressureTargetView.textField.backgroundColor = UIColor.whiteColor
                
                
                this._currentTarget = pressureInMillibars
                
                if (this.calibrationValues?.length) {
                    
                    pressureInMillibars = PressureView.interpolateAndExtrapolate(
                        this.calibrationPoints ?? [
                            { x: 0, y: 0 },
                            { x: 1, y: 1 }
                        ],
                        achievablePressureInMillibars - (this.zeroADCOffset ?? 0)
                    )
                    
                }
                
                this.requestSendTime = Date.now()
                this.pressureDuringTargetChange = this.pressureLabel.text.numericalValue
                this.recordPressureReachingTime = YES
                
                console.log("Requested pressure from user is " + this.pressureTargetView.integerValue + " mbar + zeroingValue of " + this.zeroingFactor + " mbar = " + (this.pressureTargetView.integerValue + this.zeroingFactor) + " mbar.")
                console.log("sending SETPRESSURE command with " + pressureInMillibars + " mbar.")
                this._lastSentRequestMillibars = pressureInMillibars
                await SocketClient.SetPressureOnDeviceAndPort({
                    devicePath: this.deviceObject.port.path,
                    port: this.port,
                    pressureInMillibars: pressureInMillibars
                })
                
            }
            
            this.inputTextDidChange()
            
            
        }
        this.addSubview(this.pressureTargetView)
        
        this.zeroingButton = new CBFlatButton()
        this.zeroingButton.titleLabel.text = "Set as zero"
        this.zeroingButton.colors.titleLabel.normal = UIColor.blackColor
        this.zeroingButton.addControlEventTarget.EnterDown.PointerUpInside = () => {
            
            this.zeroingFactor = this.pressureTarget + this.zeroingFactor
            this.pressureTarget = 0
            this.pressureTargetView.textField.sendControlEventForKey(UITextField.controlEvent.TextChange, nil)
            
        }
        this.addSubview(this.zeroingButton)
        
        this.zeroADCOffsetCalibrationButton = new CBFlatButton()
        this.zeroADCOffsetCalibrationButton.titleLabel.text = "Calibrate ADC offset"
        this.zeroADCOffsetCalibrationButton.colors.titleLabel.normal = UIColor.blackColor
        this.zeroADCOffsetCalibrationButton.addControlEventTarget.EnterDown.PointerUpInside = async () => {
            await this.measureADCOffset(YES)
            CBDialogViewShower.hideActionIndicatorDialog()
        }
        this.addSubview(this.zeroADCOffsetCalibrationButton)
        
        this.scanCalibrationButton = new CBFlatButton()
        this.scanCalibrationButton.titleLabel.text = "Calibrate by scanning"
        this.scanCalibrationButton.colors.titleLabel.normal = UIColor.blackColor
        this.scanCalibrationButton.addControlEventTarget.EnterDown.PointerUpInside = () => {
            this.calibrateAtMillibars(
                PressureViewController.ScanCalibrationMillibars
            )
            CBDialogViewShower.hideActionIndicatorDialog()
        }
        this.addSubview(this.scanCalibrationButton)
        
        this.calibrationChartButton = new CBFlatButton()
        this.calibrationChartButton.titleLabel.text = "Chart"
        this.calibrationChartButton.colors.titleLabel.normal = UIColor.blackColor
        this.calibrationChartButton.addControlEventTarget.EnterDown.PointerUpInside = () => {
            this.chartView.hidden = !this.chartView.hidden
            this.calibrationChartButton.selected = !this.chartView.hidden
            
            this.chart.data.datasets[0].data = this.calibrationPoints.map(point => {
                // noinspection JSSuspiciousNameCombination
                return { x: point.y, y: point.x }
            })
            this.chart.data.datasets[0].showLine = YES
            this.chart.data.datasets[0].interpolate = YES
            
            
            // this.chart.data.datasets[1].data = this.calibrationPoints
            // this.chart.data.datasets[1].showLine = YES
            // this.chart.data.datasets[1].pointRadius = 0
            // this.chart.data.datasets[1].interpolate = YES
            this.setNeedsLayoutUpToRootView()
        }
        this.addSubview(this.calibrationChartButton)
        
        this.informationLabel = new UITextView()
        //this.informationLabel.isSingleLine = NO
        this.informationLabel.useAutomaticFontSize(8)
        this.addSubview(this.informationLabel)
        
        this.inputTextArea.addControlEventTarget.PointerHover = sender => {
            
            //this.startEditing()
            
            sender.style.borderColor = UIColor.blackColor.stringValue
            
        }
        this.inputTextArea.addControlEventTarget.PointerCancel.PointerLeave = sender => sender.style.borderColor = UIColor.greyColor.stringValue
        this.inputTextArea.addControlEventTarget.TextChange = () => this.inputTextDidChange()
        
        this.chartView = new UIView(this.elementID + "ChartView", nil, "canvas")
        this.chartView.hidden = YES
        this.addSubview(this.chartView)
        
        // @ts-ignore
        const ctx = this.chartView.viewHTMLElement.getContext("2d")
        
        // @ts-ignore
        this.chart = new Chart(ctx, {
            // The type of chart we want to create
            //type: "line",
            type: "scatter",
            
            // The data for our dataset
            data: {
                //labels: ['January', 'February', 'March', 'April', 'May', 'June'],
                datasets: [
                    
                    {
                        label: "Calibration points",
                        fill: false,
                        lineTension: 0,
                        //backgroundColor: UIColor.transparentColor,
                        borderColor: "rgb(87, 173, 122)" //,
                        //data: [{ x: 0, y: 0 }, { x: 2, y: 10 }, { x: 5, y: 5 }, { x: 7, y: 2 }, { x: 8, y: 20 }, {
                        // x: 11, y: 45 }]
                    }
                    // {
                    //     label: "Fitted line",
                    //     fill: false,
                    //     lineTension: 0,
                    //     backgroundColor: "rgb(213, 150, 102)",
                    //     borderColor: "rgb(213, 150, 102)" //,
                    //     //data: [{ x: 0, y: 0 }, { x: 2, y: 10 }, { x: 5, y: 5 }, { x: 7, y: 2 }, { x: 8, y: 20 }, {
                    //     // x: 11, y: 45 }]
                    // }
                
                
                ]
            },
            
            // Configuration options go here
            options: {
                
                fill: false,
                lineTension: 0,
                scales: {
                    x: {
                        type: "linear",
                        position: "bottom"
                    },
                    y: {
                        type: "linear",
                        position: "bottom"
                    },
                    xAxes: [
                        {
                            scaleLabel: {
                                display: true,
                                labelString: "Requested (mBar)"
                            }
                        }
                    ],
                    yAxes: [
                        {
                            scaleLabel: {
                                display: true,
                                labelString: "Measured (mBar)"
                            }
                        }
                    ]
                    // yAxes: [
                    //     {
                    //         type: "linear",
                    //         ticks: {
                    //             min: -1500,
                    //             max: 1500,
                    //             callback: function (value, index, values) {
                    //                 if (value === 1000000) {
                    //                     return "1M"
                    //                 }
                    //                 if (value === 100000) {
                    //                     return "100K"
                    //                 }
                    //                 if (value === 10000) {
                    //                     return "10K"
                    //                 }
                    //                 if (value === 1000) {
                    //                     return "1K"
                    //                 }
                    //                 if (value === 100) {
                    //                     return "100"
                    //                 }
                    //                 if (value === 10) {
                    //                     return "10"
                    //                 }
                    //                 if (value === 1) {
                    //                     return "1"
                    //                 }
                    //                 if (value === 0) {
                    //                     return "0"
                    //                 }
                    //                 return null
                    //             }
                    //         }
                    //     }
                    // ]
                },
                tooltips: {
                    mode: "interpolate",
                    intersect: true
                },
                plugins: {
                    crosshair: {
                        line: {
                            color: "#F66",  // crosshair line color
                            width: 1        // crosshair line width
                        },
                        sync: {
                            enabled: true,            // enable trace line syncing with other charts
                            group: 1,                 // chart group
                            suppressTooltips: false   // suppress tooltips when showing a synced tracer
                        },
                        zoom: {
                            enabled: NO,                                      // enable zooming
                            zoomboxBackgroundColor: "rgba(66,133,244,0.2)",     // background color of zoom box
                            zoomboxBorderColor: "#48F",                         // border color of zoom box
                            zoomButtonText: "Reset Zoom",                       // reset zoom button text
                            zoomButtonClass: "reset-zoom"                      // reset zoom button class
                        },
                        callbacks: {
                            beforeZoom: function (start, end) {                  // called before zoom, return false to prevent zoom
                                return true
                            },
                            afterZoom: function (start, end) {                   // called after zoom
                            }
                        }
                    }
                }
                // responsive: false,
                // maintainAspectRatio: false,
                // showScale: true
                
            }
            
        })
        
        
    }
    
    
    get maxAchievablePressureInMillibars() {
        
        if (!this.calibrationPoints.length) {
            return 1000
        }
        
        return this.calibrationPoints.map(
            point => point.x
        ).max()
        
    }
    
    get minAchievablePressureInMillibars() {
        
        if (!this.calibrationPoints.length) {
            return -1000
        }
        
        return this.calibrationPoints.map(
            point => point.x
        ).min()
        
    }
    
    private updateInformationLabelText() {
        
        this.informationLabel.text = "Target: " + this._currentTarget + " mbar, " +
            "Zeroing factor: " + this.zeroingFactor + " mbar, " +
            "Requested as: " + (this._lastSentRequestMillibars?.integerValue ?? "(-)") + " mbar " + "ADCOffset: " + this.zeroADCOffset.toFixed(
                2) + " mbar"
        
    }
    
    private updateMinMax() {
        
        this.pressureTargetView.minValue = this.minAchievablePressureInMillibars
        this.pressureTargetView.maxValue = this.maxAchievablePressureInMillibars
        
        this.pressureTargetView.minusButton.titleLabel.text = "" +
            "<span style='font-weight: lighter; color: #9e9ba7; font-style: italic; font-size: xx-small;'>(" +
            this.pressureTargetView.minValue.integerValue +
            ")</span> " +
            "<span> - </span>"
        this.pressureTargetView.plusButton.titleLabel.text = "<span> + </span> " +
            "<span style='font-weight: lighter; color: #9e9ba7; font-style: italic; font-size: xx-small;'>(" +
            this.pressureTargetView.maxValue.integerValue +
            ")</span>"
        
        
    }
    
    set pressureTarget(pressureTarget: number) {
        this.pressureTargetView.integerValue = pressureTarget
    }
    
    get pressureTarget(): number {
        return this.pressureTargetView.integerValue
    }
    
    setInputTextIfNeeded(descriptorObject = this.descriptorObject) {
        const initialData = descriptorObject.inputString ||
            CBCore.sharedInstance.deviceNames[this.deviceLabel.text] ||
            IF(this.deviceLabel.text.contains(serialOnOffTest0021))(RETURNER("Power controller"))()
        if (initialData) {
            this.inputTextArea.text = initialData
        }
    }
    
    
    async updatePressure(scheduleUpdateIfNeeded = YES) {
        
        if (IS_NOT(this.deviceObject) || IS_NOT(this.isMemberOfViewTree)) {
            console.log("Update pressure stop " + this.port)
            return
        }
        
        //console.log("Update pressure " + this.port)
        let requestResult = (await SocketClient.RetrievePressuresOnPressureDevice(
            {
                devicePath: this.deviceObject.port.path,
                // This prevents the server from ignoring parallel requests
                // @ts-ignore
                port: this.port,
                randomString: MAKE_ID()
            },
            CBSocketClient.completionPolicy.directOnly
        )).result
        
        const scheduleNextUpdateIfNeeded = () => {
            if (this.isUpdatingPressureScheduled) {
                return
            }
            setTimeout(() => {
                this.isUpdatingPressureScheduled = NO
                this.updatePressure()
            }, 100)
            this.isUpdatingPressureScheduled = YES
        }
        
        if (IS_NOT(requestResult.pressuresObject)) {
            scheduleNextUpdateIfNeeded()
            return
        }
        
        this.deviceObject.pressuresObject = requestResult.pressuresObject
        
        const pressureInPoints: number = FIRST(this.deviceObject?.pressuresObject?.[this.port], 0)
        const maxPressureInMillibars = this.deviceObject.maxPressureInMillibars ?? 1
        const minPressureInMillibars = this.deviceObject.minPressureInMillibars ?? 0
        // @ts-ignore
        const maxVoltage = window.maxVoltage ?? 5
        
        const pressure = ((pressureInPoints * this.deviceObject.pressuresObject?.multiplier ?? 0) / maxVoltage) *
            (maxPressureInMillibars - minPressureInMillibars) + minPressureInMillibars
        
        this.pressureLabel.text = "" + (
            pressure + this.zeroADCOffset - this.zeroingFactor // + this.deviceObject.minPressureInMillibars
        ).toPrecision(5)
        
        // Detect stabilization
        
        const pressureValue = this.pressureLabel.text.numericalValue
        const currentTime = Date.now()
        this.slidingWindows.push([])
        this.slidingWindows.everyElement.push({ time: currentTime, pressureValue: pressureValue })
        
        let isPressureReached = NO
        let timeTakenToReachTarget = -1
        
        if ((currentTime - this.slidingWindows.lastElement.firstElement.time) >= (this.slidingWindowLengthInSeconds * 1000)) {
            
            const chunkLength = this.slidingWindowChunkLengthInSeconds * 1000
            const windowDatapoints = this.slidingWindows.pop()
            const firstChunkData = windowDatapoints.filter(
                dataPoint => windowDatapoints.firstElement.time + chunkLength >= dataPoint.time
            )
            
            const firstChunkAverage = firstChunkData.everyElement.pressureValue.UI_elementValues.average()
            const newestChunkData = windowDatapoints.filter(
                dataPoint => dataPoint.time >= windowDatapoints.lastElement.time - chunkLength
            )
            const newestChunkAverage = newestChunkData.everyElement.pressureValue.UI_elementValues.average()
            
            isPressureReached = ((newestChunkAverage - firstChunkAverage) > 0.1)
            if (isPressureReached) {
                timeTakenToReachTarget = (windowDatapoints.firstElement.time - this.requestSendTime) / 1000
            }
            
        }
        
        // Measure time if the pressure has reached or exceeded the target value
        if (this.recordPressureReachingTime && isPressureReached) {
            
            this.recordPressureReachingTime = NO
            console.log(" ")
            console.log("Port " + this.port + " pressure reached in " + timeTakenToReachTarget.toFixed(1) + " seconds.")
            console.log("Starting pressure was " + this.pressureDuringTargetChange + " mbar.")
            console.log("Target pressure was " + this._currentTarget + " mbar.")
            console.log("Value reached was " + pressureValue + " mbar.")
            console.log(" ")
            
            const statisticsValues = this.statisticsValues
            
            statisticsValues[this.port].push({
                
                startingPressure: this.pressureDuringTargetChange,
                targetPressure: this._currentTarget,
                valueReached: pressureValue,
                timeTaken: timeTakenToReachTarget,
                currentTime: Date.now()
                
            })
            
            this.statisticsValues = statisticsValues
            
            
        }
        
        if (!this.isUpdatingPressureScheduled && scheduleUpdateIfNeeded) {
            scheduleNextUpdateIfNeeded()
        }
        
        this.updateInformationLabelText()
        this.updateMinMax()
        
        return pressure
        
    }
    
    set statisticsValues(value: StatisticsObject) {
        localStorage.setItem("_statisticsValues", JSON.stringify(value))
    }
    
    get statisticsValues(): StatisticsObject | undefined {
        return JSON.parse(localStorage.getItem("_statisticsValues") ?? "{ \"A\": [], \"B\": [], \"C\": [], \"D\": [] }")
    }
    
    async measureADCOffset(showDialog = YES) {
        
        if (showDialog) {
            await new Promise(resolve =>
                CBDialogViewShower.alert(
                    "Disconnect and open all inputs and outputs and press ok.",
                    () => resolve(null)
                )
            )
        }
        
        // Measure the inaccuracy from the ADC at zero
        this.zeroADCOffsetObject = await this.measureCalibrationValueAtMillibars(0, 25)
        
    }
    
    async calibrateAtMillibars(millibars: number[], numberOfSamplesPerPoint = 10, showDialog = YES) {
        
        if (showDialog) {
            await new Promise(resolve =>
                CBDialogViewShower.alert(
                    "Connect all inputs and close all outputs and press ok.",
                    () => resolve(null)
                )
            )
        }
        
        CBDialogViewShower.showActionIndicatorDialog("Calibrating")
        
        const pressures: PressureCalibrationMeasurementObject[] = []
        for (let i = 0; i < millibars.length; i++) {
            pressures.push(await this.measureCalibrationValueAtMillibars(millibars[i], numberOfSamplesPerPoint))
        }
        
        console.log(pressures)
        CBDialogViewShower.hideActionIndicatorDialog()
        
        this.calibrationValues = pressures
        
        // Set pressure target to zero to avoid unnecessary flow
        this.pressureTargetView.integerValue = 0
        this.pressureTargetView.textField.sendControlEventForKey(UITextField.controlEvent.EnterDown, nil)
        
        console.log("Calibration points", this.calibrationPoints)
        
        return pressures
        
    }
    
    private async measureCalibrationValueAtMillibars(millibars: number, numberOfSamples = 10) {
        
        const pressures: number[] = []
        
        async function delay(ms: number): Promise<void> {
            return new Promise(resolve => setTimeout(resolve, ms))
        }
        
        const initialDelay = 5250
        const measuringDelay = 250
        
        const durationString = "(" + ((initialDelay + measuringDelay * (numberOfSamples - 1)) * 0.001).integerValue + "s)"
        CBDialogViewShower.showActionIndicatorDialog(
            "Cal " + millibars + " mbar. Port " + this.port + ". " +
            durationString
        )
        
        await SocketClient.SetPressureOnDeviceAndPort({
            devicePath: this.deviceObject.port.path,
            port: this.port,
            pressureInMillibars: millibars
        })
        
        await delay(initialDelay)
        
        for (let i = 0; i < numberOfSamples; i++) {
            CBDialogViewShower.showActionIndicatorDialog(
                "Cal " + millibars + " mbar. Port " + this.port + " " + (i + 1) + durationString
            )
            const pressureValue = await this.updatePressure(NO)
            pressures.push(pressureValue)
            await delay(measuringDelay)
            
        }
        
        const result = {
            averageMillibarsMeasured: pressures.average(),
            measuredPressures: pressures,
            requestedMillibars: millibars,
            devicePath: this.deviceObject.port.path,
            port: this.port
        }
        
        return result
        
    }
    
    static interpolateAndExtrapolate(points: PVPoint[], x: number): number {
        
        // Find the two points that x lies between
        let i = 0
        while (i < points.length && points[i].x < x) {
            i++
        }
        
        // If x is less than the first point, extrapolate using the first two points
        if (i === 0) {
            return points[0].y + ((points[1].y - points[0].y) / (points[1].x - points[0].x)) * (x - points[0].x)
        }
        
        // If x is greater than the last point, extrapolate using the last two points
        if (i === points.length) {
            return points[points.length - 1].y + ((points[points.length - 1].y - points[points.length - 2].y) / (points[points.length - 1].x - points[points.length - 2].x)) * (x - points[points.length - 1].x)
        }
        
        // Otherwise, interpolate using the two points that x lies between
        return points[i - 1].y + ((points[i].y - points[i - 1].y) / (points[i].x - points[i - 1].x)) * (x - points[i - 1].x)
    }
    
    inputTextDidChange() {
        
        wrapInNil(this._descriptorObject).updateDate = Date.now()
        
        this.inputTextArea.invalidateSizeCache()
        
        const deviceNames = CBCore.sharedInstance.deviceNames
        deviceNames[this.deviceLabel.text] = this.inputTextArea.text
        CBCore.sharedInstance.deviceNames = deviceNames
        
        this.updatePressure().then(nil)
        
    }
    
    
    wasAddedToViewTree() {
        super.wasAddedToViewTree()
        this.updatePressure().then(nil)
    }
    
    
    layoutSubviews() {
        
        super.layoutSubviews()
        
        const padding = RootViewController.paddingLength
        const labelHeight = padding * 1.25
        const bounds = this.bounds.rectangleWithInset(2)
        
        //this.setPaddings(0, 0, padding, 0)
        this.setBorder()
        
        this.inputTextArea.setBorder(0, 1, UIColor.lightGreyColor)
        this.inputTextArea.setPaddings(10, 10)
        
        // This is so that we can find the correct height properly
        //this.inputTextArea.setMinSizes(0)
        // this.inputTextArea.viewHTMLElement.className = this.inputTextArea.viewHTMLElement.className +
        //     " ck ck-content ck-editor__editable ck-rounded-corners ck-editor__editable_inline"
        // this.inputTextArea.viewHTMLElement.querySelectorAll("figure.image").forEach(
        //     value => value.className = value.className + " ck-widget"
        // )
        
        bounds.rectangleWithHeight([this.inputTextArea.intrinsicContentHeight(bounds.width) + 5, labelHeight].max())
            .distributeViewsEquallyAlongWidth([this.inputTextArea, this.deviceLabel], 0)
        
        this.pressureLabel.frame = this.inputTextArea.frame.rectangleForNextRow(padding, 50)
            .rectangleWithWidth(bounds.width * 0.5)
        
        this.pressureTargetView.frame = this.deviceLabel.frame.rectangleForNextRow(padding, 50)
            .rectangleWithWidth(bounds.width * 0.5, 1)
        
        this.pressureLabel.frame.rectangleForNextRow(padding * 0.5, labelHeight)
            .rectangleWithWidth(bounds.width)
            .distributeViewsAlongWidth(
                [
                    this.zeroingButton,
                    this.zeroADCOffsetCalibrationButton,
                    this.scanCalibrationButton,
                    this.calibrationChartButton,
                    this.informationLabel
                ],
                1,
                padding,
                [120, 200, 200, 100, nil]
            )
        
        
        this.previousWidth = bounds.width
        
        this.chartView.frame = this.zeroingButton.frame.rectangleForNextRow(
            padding,
            (bounds.width * 2.5 / 3.5) * 0.5
        ).rectangleWithX(padding).rectangleWithWidth(bounds.width - padding * 2)
        //.rectangleWithInsets(padding * 5 * 0, padding * 5, 0, 0)
        //.rectangleByAddingX(-padding)
        
        //this.chartView.setPadding(padding);
        
        this.chartView.setMaxSizes(this.chartView.frame.height, this.chartView.frame.width)
        
        
    }
    
    
    intrinsicContentHeight(constrainingWidth: number = 0): number {
        
        const padding = RootViewController.paddingLength
        const labelHeight = padding * 1.5
        
        var chartHeight = (constrainingWidth * 2.5 / 3.5) * 0.5
        
        var result = padding +
            this.inputTextArea.intrinsicContentHeight(constrainingWidth) + padding + labelHeight + padding + labelHeight
        
        if (IS_NOT(this.chartView.hidden)) {
            
            result = result + padding + chartHeight
            
        }
        
        return result
        
        
    }
    
    
}


//@ts-ignore
Chart.Interaction.modes["interpolate"] = function (chart, e, options) {
    
    // This function has a separate license
    
    // MIT License
    //
    // Copyright (c) 2018 Abel Heinsbroek
    //
    // Permission is hereby granted, free of charge, to any person obtaining a copy
    // of this software and associated documentation files (the "Software"), to deal
    // in the Software without restriction, including without limitation the rights
    // to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    // copies of the Software, and to permit persons to whom the Software is
    // furnished to do so, subject to the following conditions:
    //
    //     The above copyright notice and this permission notice shall be included in all
    // copies or substantial portions of the Software.
    //
    //     THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    // IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    //     FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    // AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    // LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    //     OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    // SOFTWARE.
    
    var items = []
    
    for (var datasetIndex = 0; datasetIndex < chart.data.datasets.length; datasetIndex++) {
        
        
        // check for interpolate setting
        if (!chart.data.datasets[datasetIndex].interpolate) {
            continue
        }
        
        var meta = chart.getDatasetMeta(datasetIndex)
        // do not interpolate hidden charts
        if (meta.hidden) {
            continue
        }
        
        
        var xScale = chart.scales[meta.xAxisID]
        var yScale = chart.scales[meta.yAxisID]
        
        var xValue = xScale.getValueForPixel(e.x)
        
        
        var data = chart.data.datasets[datasetIndex].data
        
        var index = data.findIndex(function (o) {
            return o.x >= xValue
        })
        
        if (index === -1) {
            continue
        }
        
        
        // linear interpolate value
        var prev = data[index - 1]
        var next = data[index]
        
        if (prev && next) {
            var slope = (next.y - prev.y) / (next.x - prev.x)
            var interpolatedValue = prev.y + (xValue - prev.x) * slope
        }
        
        if (chart.data.datasets[datasetIndex].steppedLine && prev) {
            interpolatedValue = prev.y
        }
        
        if (isNaN(interpolatedValue)) {
            continue
        }
        
        var yPosition = yScale.getPixelForValue(interpolatedValue)
        
        // do not interpolate values outside of the axis limits
        if (isNaN(yPosition)) {
            continue
        }
        
        // create a 'fake' event point
        
        var fakePoint = {
            
            value: interpolatedValue,
            xValue: xValue,
            
            tooltipPosition: function () {
                return this._model
            },
            hasValue: function () {
                return true
            },
            _model: {
                x: e.x,
                y: yPosition
            },
            _datasetIndex: datasetIndex,
            _index: items.length,
            _xScale: {
                getLabelForIndex: function (indx) {
                    
                    let xValue: number = items[indx].xValue
                    
                    xValue = xValue.toPrecision(5) as any
                    
                    return xValue
                    
                }
            },
            _yScale: {
                getLabelForIndex: function (indx) {
                    
                    let value = items[indx].value.toPrecision(5)
                    
                    return value
                    
                }
            },
            _chart: chart
            
        }
        
        items.push(fakePoint)
        
    }
    
    
    // add other, not interpolated, items
    // @ts-ignore
    var xItems = Chart.Interaction.modes.x(chart, e, options)
    
    xItems.forEach((item, index, array) => {
        
        
        if (!chart.data.datasets[item._datasetIndex].interpolate) {
            items.push(item)
        }
        
    })
    
    
    return items
}







































































