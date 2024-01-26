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


interface PVPoint {
    x: number;
    y: number;
}


class PressureView extends UIView {
    
    titleLabel: UITextView
    inputTextArea: UITextArea
    
    // chartView: UIView
    // chart: any
    // resultsLabel: UIView
    
    previousWidth: number
    private readonly closeButton: CBButton
    private readonly deviceTextField: UITextField
    private readonly pressureTargetView: EnterNumericalValueView
    
    private readonly pressureLabel: UITextView
    private isUpdatingPressureScheduled: boolean
    
    private readonly zeroingButton: CBButton
    private readonly informationLabel: UITextView
    
    private readonly zeroADCOffsetCalibrationButton: CBButton
    private readonly scanCalibrationButton: CBButton
    
    private _descriptorObject: PressureDescriptorObject
    private _lastSentRequestMillibars: number
    private _currentTarget: number
    
    set descriptorObject(descriptorObject: PressureDescriptorObject) {
        
        this._descriptorObject = descriptorObject
        this.inputTextArea.innerHTML = descriptorObject.inputString
        
        // @ts-ignore
        let model = wrapInNil(descriptorObject).deviceObject.model
        
        this.deviceTextField.text = FIRST(
            wrapInNil(descriptorObject).deviceObject.serialNumber,
            "Missing serial number."
        ) + " " + FIRST(model, "No model") + " " + descriptorObject.portString
        
        this.setInputTextIfNeeded(descriptorObject)
        
        if (this.deviceTextField.text.contains(serialOnOffTest0021)) {
            this.userInteractionEnabled = NO
            this.alpha = 0.5
        }
        
        this.pressureTargetView.numericalValue = descriptorObject.pressureValue || 0
        this.deviceObject = descriptorObject.deviceObject || nil
        this.titleLabel.text = new Date(descriptorObject.date || descriptorObject.updateDate).dateString +
            " (updated at " + new Date(descriptorObject.updateDate).dateString + ")" + " " + this.deviceObject.port.path
        
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
        return JSON.parse(localStorage.getItem("_calibrationValues_" + this.port))
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
        
        this.backgroundColor = UIColor.whiteColor
        
        this.titleLabel = new UITextView(this.elementID + "TitleLabel", UITextView.type.header3)
        this.titleLabel.textAlignment = UITextView.textAlignment.left
        this.titleLabel.nativeSelectionEnabled = NO
        this.titleLabel.isSingleLine = NO
        this.addSubview(this.titleLabel)
        
        this.closeButton = new CBButton()
        this.closeButton.titleLabel.text = "Close"
        this.addSubview(this.closeButton)
        
        this.inputTextArea = new UITextArea(this.elementID + "InputTextArea")
        this.inputTextArea.changesOften = YES
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
        
        this.deviceTextField = new UITextField(this.elementID + "DeviceTextField")
        this.deviceTextField.placeholderText = "Input your device path here."
        this.deviceTextField.userInteractionEnabled = NO
        this.addSubview(this.deviceTextField)
        
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
            if (isTextFieldFocused && event instanceof KeyboardEvent && eventKeyIsEnter(event)) {
                return
            }
            
            if (IS(this.deviceObject) && !isNaN(this.pressureTargetView.integerValue)) {
                
                let pressureInMillibars = this.pressureTargetView.integerValue + this.zeroingFactor
                
                this._currentTarget = pressureInMillibars
                
                if (this.calibrationValues) {
                    
                    pressureInMillibars = PressureView.interpolateAndExtrapolate(
                        this.calibrationPoints ?? [
                            { x: 0, y: 0 },
                            { x: 1, y: 1 }
                        ],
                        pressureInMillibars - (this.zeroADCOffset ?? 0)
                    )
                    
                }
                
                
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
        
        this.zeroingButton = new CBButton()
        this.zeroingButton.titleLabel.text = "Set as zero"
        this.zeroingButton.addControlEventTarget.EnterDown.PointerUpInside = () => {
            
            this.zeroingFactor = this.pressureTarget + this.zeroingFactor
            this.pressureTarget = 0
            this.pressureTargetView.textField.sendControlEventForKey(UITextField.controlEvent.TextChange, nil)
            
        }
        this.addSubview(this.zeroingButton)
        
        this.zeroADCOffsetCalibrationButton = new CBButton()
        this.zeroADCOffsetCalibrationButton.titleLabel.text = "Calibrate ADC offset"
        this.zeroADCOffsetCalibrationButton.addControlEventTarget.EnterDown.PointerUpInside = async () => {
            await this.measureADCOffset(YES)
            CBDialogViewShower.hideActionIndicatorDialog()
        }
        this.addSubview(this.zeroADCOffsetCalibrationButton)
        
        this.scanCalibrationButton = new CBButton()
        this.scanCalibrationButton.titleLabel.text = "Calibrate by scanning"
        this.scanCalibrationButton.addControlEventTarget.EnterDown.PointerUpInside = () => {
            this.calibrateAtMillibars(
                PressureViewController.ScanCalibrationMillibars
            )
            CBDialogViewShower.hideActionIndicatorDialog()
        }
        this.addSubview(this.scanCalibrationButton)
        
        this.informationLabel = new UITextView()
        this.informationLabel.isSingleLine = NO
        this.addSubview(this.informationLabel)
        
        this.closeButton.addControlEventTarget.PointerUpInside.EnterDown = (sender, event) => {
            
            this.closeView()
            
        }
        
        this.inputTextArea.addControlEventTarget.PointerHover = sender => {
            
            //this.startEditing()
            
            sender.style.borderColor = UIColor.blackColor.stringValue
            
        }
        this.inputTextArea.addControlEventTarget.PointerCancel.PointerLeave = sender => sender.style.borderColor = UIColor.greyColor.stringValue
        this.inputTextArea.addControlEventTarget.TextChange = () => this.inputTextDidChange()
        
    }
    
    
    private updateInformationLabelText() {
        
        this.informationLabel.text = "Target: " + this._currentTarget + " mbar, " +
            "Zeroing factor: " + this.zeroingFactor + " mbar, " +
            "Requested as: " + (this._lastSentRequestMillibars?.integerValue ?? "(-)") + " mbar\n" + "ADCOffset: " + this.zeroADCOffset.toFixed(2) + " mbar"
        
    }
    
    set pressureTarget(pressureTarget: number) {
        this.pressureTargetView.integerValue = pressureTarget
    }
    
    get pressureTarget(): number {
        return this.pressureTargetView.integerValue
    }
    
    setInputTextIfNeeded(descriptorObject = this.descriptorObject) {
        const initialData = descriptorObject.inputString ||
            CBCore.sharedInstance.deviceNames[this.deviceTextField.text] ||
            IF(this.deviceTextField.text.contains(serialOnOffTest0021))(RETURNER("Power controller"))()
        if (initialData) {
            this.inputTextArea.text = initialData
        }
    }
    
    
    private async updatePressure(scheduleUpdate = YES) {
        
        if (IS_NOT(this.deviceObject) || IS_NOT(this.isMemberOfViewTree)) {
            //console.log("Update pressure stop " + this.port)
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
        
        if (IS_NOT(requestResult.pressuresObject)) {
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
        
        if (!this.isUpdatingPressureScheduled && scheduleUpdate) {
            setTimeout(() => {
                this.isUpdatingPressureScheduled = NO
                this.updatePressure()
            }, 100)
            this.isUpdatingPressureScheduled = YES
        }
        
        this.updateInformationLabelText()
        
        return pressure
        
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
        
        // Set pressure target to zero to avoid unnecessary flow
        await SocketClient.SetPressureOnDeviceAndPort({
            devicePath: this.deviceObject.port.path,
            port: this.port,
            pressureInMillibars: 0
        })
        this.pressureTargetView.integerValue = 0
        
        this.calibrationValues = pressures
        
        console.log("Calibration points", this.calibrationPoints)
        
        return pressures
        
    }
    
    private async measureCalibrationValueAtMillibars(millibars: number, numberOfSamples = 10) {
        
        const pressures: number[] = []
        
        async function delay(ms: number): Promise<void> {
            return new Promise(resolve => setTimeout(resolve, ms))
        }
        
        CBDialogViewShower.showActionIndicatorDialog("Cal " + millibars + " mbar. Port " + this.port)
        
        await SocketClient.SetPressureOnDeviceAndPort({
            devicePath: this.deviceObject.port.path,
            port: this.port,
            pressureInMillibars: millibars
        })
        
        await delay(5250)
        
        for (let i = 0; i < numberOfSamples; i++) {
            
            CBDialogViewShower.showActionIndicatorDialog("Cal " + millibars + " mbar. Port " + this.port + " " + (i + 1))
            const pressureValue = await this.updatePressure(NO)
            pressures.push(pressureValue)
            await delay(250)
            
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
        
        this.titleLabel.text = new Date(FIRST(
                wrapInNil(this._descriptorObject).date,
                wrapInNil(this._descriptorObject).updateDate
            )).dateString +
            " (updated at " + new Date(FIRST(wrapInNil(this._descriptorObject).updateDate, null)).dateString + ")" +
            " " + this.deviceObject.port.path
        
        this.inputTextArea.invalidateSizeCache()
        
        const deviceNames = CBCore.sharedInstance.deviceNames
        deviceNames[this.deviceTextField.text] = this.inputTextArea.text
        CBCore.sharedInstance.deviceNames = deviceNames
        
        this.updatePressure().then(nil)
        
    }
    
    closeView() {
        // Close the view
    }
    
    wasAddedToViewTree() {
        super.wasAddedToViewTree()
        this.updatePressure().then(nil)
    }
    
    
    layoutSubviews() {
        
        super.layoutSubviews()
        
        const padding = RootViewController.paddingLength
        const labelHeight = padding * 1.25
        const bounds = this.bounds
        
        this.setPaddings(0, 0, padding, 0)
        
        this.titleLabel.frame = bounds //.rectangleWithInsets(padding, padding, 0, padding)
            .rectangleWithHeight(this.titleLabel.intrinsicContentHeight(bounds.width - padding * 2 * 0))
        
        this.closeButton.frame = this.titleLabel.frame.rectangleWithWidth(150, 1)
        
        this.inputTextArea.setBorder(0, 1, UIColor.lightGreyColor)
        this.inputTextArea.setPaddings(10, 10)
        
        // This is so that we can find the correct height properly
        //this.inputTextArea.setMinSizes(0)
        this.inputTextArea.viewHTMLElement.className = this.inputTextArea.viewHTMLElement.className +
            " ck ck-content ck-editor__editable ck-rounded-corners ck-editor__editable_inline"
        this.inputTextArea.viewHTMLElement.querySelectorAll("figure.image").forEach(
            value => value.className = value.className + " ck-widget"
        )
        
        
        // Performing unchecked layout because the editor changes the actual frame
        this.inputTextArea.setFrame(
            this.titleLabel.frame.rectangleForNextRow(
                padding * 0.25,
                [this.inputTextArea.intrinsicContentHeight(this.titleLabel.frame.width) + 5, labelHeight * 2].max()
            ).performFunctionWithSelf(self => {
                self.width = self.width * 0.5 - 20
                return self
            }),
            0,
            YES
        )
        
        //this.inputTextArea.setMinSizes(this.inputTextArea.frame.height)
        
        
        this.deviceTextField.frame = this.inputTextArea.frame //.rectangleForNextRow(padding, labelHeight * 2)
            .rectangleForNextColumn(padding * 2)
        
        this.pressureLabel.frame = this.inputTextArea.frame.rectangleForNextRow(padding, 50)
            .rectangleWithWidth(bounds.width * 0.5)
        
        this.pressureTargetView.frame = this.deviceTextField.frame.rectangleForNextRow(padding, 50)
            .rectangleWithWidth(bounds.width * 0.5, 1)
        
        this.pressureLabel.frame.rectangleForNextRow(padding)
            .rectangleWithWidth(bounds.width)
            .distributeViewsAlongWidth(
                [
                    this.zeroingButton,
                    this.zeroADCOffsetCalibrationButton,
                    this.scanCalibrationButton,
                    this.informationLabel
                ],
                1,
                padding,
                [200, 200, 200, nil]
            )
        
        
        this.previousWidth = bounds.width
        
        // this.inputTextArea.frame = this.titleLabel.frame.rectangleForNextRow(
        //     padding * 0.25,
        //     this.inputTextArea.intrinsicContentHeight(this.titleLabel.frame.width) + 5
        // )
        
        // this.chartView.frame = this.chartView.frame.rectangleWithHeightRelativeToWidth(0.5)
        // //     this.resultsLabel.frame.rectangleForNextRow(
        // //     padding,
        // //     this.inputTextArea.frame.width * 0.5
        // // )
        // //.rectangleWithInsets(padding * 5 * 0, padding * 5, 0, 0)
        // //.rectangleByAddingX(-padding)
        //
        // //this.chartView.setPadding(padding);
        //
        // this.chartView.setMaxSizes(this.chartView.frame.height, this.chartView.frame.width)
        //
        // this.resultsLabel.frame = this.chartView.frame.rectangleForNextRow(
        //     padding,
        //     this.resultsLabel.intrinsicContentHeight(this.chartView.frame.width - padding * 2)
        // ).rectangleWithWidth(this.chartView.frame.width - padding * 2, 0.5)
        
        
    }
    
    
    intrinsicContentHeight(constrainingWidth: number = 0): number {
        
        const padding = RootViewController.paddingLength
        const labelHeight = padding * 1.5
        
        var chartHeight = (constrainingWidth * 2.5 / 3.5) * 0.5
        
        var result = padding + this.titleLabel.intrinsicContentHeight(constrainingWidth) + padding * 0.25 +
            this.inputTextArea.intrinsicContentHeight(constrainingWidth) + padding + labelHeight * 2 + padding + 50 + padding + labelHeight * 2
        
        // if (IS_NOT(this.chartView.hidden)) {
        //
        //     result = result + padding + (constrainingWidth - padding * 2) * 0.5 + padding + labelHeight * 2
        //
        // }
        
        return result
        
        
    }
    
    
}









































































