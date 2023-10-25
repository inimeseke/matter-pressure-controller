/// <reference path="./UICore/UIViewController.ts" />
///<reference path="UICore/UITextView.ts"/>
///<reference path="Custom components/CBButton.ts"/>
///<reference path="UICore/UITextArea.ts"/>


//InlineEditor = CKSource.Editor


class PressureView extends UIView {
    
    
    titleLabel: UITextView
    inputTextArea: UITextArea
    
    // chartView: UIView
    // chart: any
    // resultsLabel: UIView
    
    
    private _descriptorObject: PressureDescriptorObject
    previousWidth: number
    private readonly closeButton: CBButton
    private readonly deviceTextField: UITextField
    private readonly pressureTargetView: EnterNumericalValueView
    
    private _deviceObject: SerialPortPressureDeviceConnectionObject
    private readonly pressureLabel: UITextView
    private isUpdatingPressureScheduled: boolean
    
    
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
        
        //this.startEditing()
        
        
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
        this.addSubview(this.pressureTargetView)
        
        this.pressureTargetView.textField.addControlEventTarget.TextChange.Blur.EnterDown = async (sender, event) => {
            
            //console.log(sender)
            
            const isTextFieldFocused = this.pressureTargetView.textField.viewHTMLElement == document.activeElement
            
            // If the event is nil, then the event is from + or - buttons
            if (IS(this.deviceObject) && !isTextFieldFocused || IS_NOT(event)) {
                
                await SocketClient.SetPressureOnDeviceAndPort({
                    devicePath: this.deviceObject.port.path,
                    port: this.port,
                    pressureInMillibars: this.pressureTargetView.integerValue
                })
                
            }
            
            this.inputTextDidChange()
            
            
        }
        
        
        this.pressureTargetView.textField.addControlEventTarget.Blur.EnterDown = async (sender, event) => {
            
            //console.log(sender)
            
            if (IS(this.deviceObject)) {
                
                await SocketClient.SetPressureOnDeviceAndPort({
                    devicePath: this.deviceObject.port.path,
                    port: this.port,
                    pressureInMillibars: this.pressureTargetView.integerValue
                })
                
            }
            
            this.inputTextDidChange()
            
            
        }
        
        
        this.closeButton.addControlEventTarget.PointerUpInside.EnterDown = (sender, event) => {
            
            this.closeView()
            
        }
        
        this.inputTextArea.addControlEventTarget.PointerHover = (
            sender,
            event
        ) => {
            
            //this.startEditing()
            
            sender.style.borderColor = UIColor.blackColor.stringValue
            
        }
        this.inputTextArea.addControlEventTarget.PointerCancel.PointerLeave = (
            sender,
            event
        ) => sender.style.borderColor = UIColor.greyColor.stringValue
        
        this.inputTextArea.addControlEventTarget.TextChange = (sender, event) => this.inputTextDidChange()
        
        
    }
    
    
    get pressureTarget(): number {
        
        return this.pressureTargetView.integerValue
        
    }
    
    set pressureTarget(pressureTarget: number) {
        
        this.pressureTargetView.integerValue = pressureTarget
        
    }
    
    
    get exportObject() {
        
        let objectValue = {
            
            identifier: this._descriptorObject.identifier,
            
            portString: this.port,
            
            viewType: TextPlotterView.name,
            inputString: this.inputTextArea.text,
            date: FIRST(
                FIRST_OR_NIL(this._descriptorObject).date,
                FIRST_OR_NIL(this._descriptorObject).updateDate,
                null
            ),
            updateDate: FIRST(FIRST_OR_NIL(this._descriptorObject).updateDate, null)
            
        }
        
        this._descriptorObject = objectValue
        
        let result = this._descriptorObject
        
        return result
        
    }
    
    
    get descriptorObject() {
        
        let objectValue: PressureDescriptorObject = {
            
            identifier: this._descriptorObject.identifier || MAKE_ID(),
            
            viewType: PressureView.name,
            inputString: FIRST(this.inputTextArea.text, this.inputTextArea.innerHTML),
            //devicePath: this.deviceTextField.text,
            pressureValue: this.pressureTargetView.numericalValue,
            
            portString: this.port,
            
            date: FIRST(
                FIRST_OR_NIL(this._descriptorObject).date,
                FIRST_OR_NIL(this._descriptorObject).updateDate,
                null
            ),
            updateDate: FIRST(FIRST_OR_NIL(this._descriptorObject).updateDate, null)
            
        }
        
        this._descriptorObject = objectValue
        
        const result = this._descriptorObject
        
        return result
        
    }
    
    
    set descriptorObject(descriptorObject: PressureDescriptorObject) {
        
        this._descriptorObject = descriptorObject
        
        this.inputTextArea.innerHTML = descriptorObject.inputString
        
        // @ts-ignore
        let model = wrapInNil(descriptorObject).deviceObject.model
        
        this.deviceTextField.text = FIRST(
            wrapInNil(descriptorObject).deviceObject.serialNumber,
            "Missing serial number."
        ) + " " + FIRST(model, "No model") + " " + descriptorObject.portString
        
        // + " " + FIRST(wrapInNil(descriptorObject).deviceObject.port.path, "Missing device path")
        
        this.setInputTextIfNeeded(descriptorObject)
        
        if (this.deviceTextField.text.contains(serialOnOffTest0021)) {
            
            this.userInteractionEnabled = NO
            
            this.alpha = 0.5
            
        }
        
        this.pressureTargetView.numericalValue = descriptorObject.pressureValue || 0
        
        this.deviceObject = descriptorObject.deviceObject || nil
        
        //this.inputTextDidChange()
        
        this.titleLabel.text = new Date(this._descriptorObject.date || this._descriptorObject.updateDate).dateString +
            " (updated at " + new Date(this._descriptorObject.updateDate).dateString + ")" + " " + this.deviceObject.port.path
        
        
    }
    
    get port(): "A" | "B" | "C" | "D" {
        return this._descriptorObject.portString
    }
    
    setInputTextIfNeeded(descriptorObject = this.descriptorObject) {
        
        const initialData = descriptorObject.inputString ||
            CBCore.sharedInstance.deviceNames[this.deviceTextField.text] ||
            IF(this.deviceTextField.text.contains(serialOnOffTest0021))(RETURNER("Power controller"))()
        
        if (initialData) {
            
            this.inputTextArea.text = initialData
            
        }
        
    }
    
    get deviceObject() {
        return this._deviceObject
    }
    
    set deviceObject(deviceObject: SerialPortPressureDeviceConnectionObject) {
        
        this._deviceObject = deviceObject
        
        // Ask server about the pressure
        
        this.updatePressure().then(nil)
        
    }
    
    
    private async updatePressure() {
        
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
                port: this.port
            },
            CBSocketClient.completionPolicy.directOnly
        )).result
        
        this.deviceObject.pressuresObject = requestResult.pressuresObject
        
        const pressureInPoints: number = FIRST(this.deviceObject?.pressuresObject?.[this.port], 0)
        const maxPressureInMillibars = this.deviceObject.maxPressureInMillibars ?? 1
        const minPressureInMillibars = this.deviceObject.minPressureInMillibars ?? 0
        // @ts-ignore
        const maxVoltage = window.maxVoltage ?? 5
        
        const pressure = ((pressureInPoints * this.deviceObject.pressuresObject?.multiplier ?? 0) / maxVoltage) *
            (maxPressureInMillibars - minPressureInMillibars) + minPressureInMillibars
        
        this.pressureLabel.text = "" + (
            pressure // + this.deviceObject.minPressureInMillibars
        ).toPrecision(5)
        
        if (!this.isUpdatingPressureScheduled) {
            
            setTimeout(() => {
                
                this.isUpdatingPressureScheduled = NO
                
                this.updatePressure()
                
            }, 100)
            
            this.isUpdatingPressureScheduled = YES
            
        }
        
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
        
        //this.titleLabel.text = "Enter your data like shown."
        
        this.updatePressure().then(nil)
        
        //this.inputTextDidChange()
        
    }
    
    
    layoutSubviews() {
        
        super.layoutSubviews()
        
        const padding = RootViewController.paddingLength
        const labelHeight = padding * 1.25
        
        // View bounds
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
        
        this.inputTextArea.viewHTMLElement.querySelectorAll("figure.image").forEach((value, key, parent) =>
            value.className = value.className + " ck-widget")
        
        
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
            this.inputTextArea.intrinsicContentHeight(constrainingWidth) + padding + labelHeight * 2 + padding + 50
        
        // if (IS_NOT(this.chartView.hidden)) {
        //
        //     result = result + padding + (constrainingWidth - padding * 2) * 0.5 + padding + labelHeight * 2
        //
        // }
        
        return result
        
        
    }
    
    
}









































































