/// <reference path="./UICore/UIViewController.ts" />
///<reference path="UICore/UITextView.ts"/>
/// <reference path="./SharedTypes.d.ts" />


interface PressureDescriptorObject {
    
    identifier: string
    
    date: number
    updateDate: number
    viewType: string
    inputString: string
    deviceObject?: SerialPortDeviceObject;
    pressureValue?: number;
    
    model: string;
    portString: "A" | "B" | "C" | "D"
    
    
}


class PressureViewController extends UIViewController {
    
    private _descriptorObjects: PressureDescriptorObject[]
    private _pressureViews: PressureView[] = []
    private devicesDropdown: SearchableDropdown<SerialPortDeviceObject>
    
    private zeroADCOffsetCalibrationButton: CBButton
    private scanCalibrationButton: CBButton
    
    static instance: PressureViewController
    private _ignoreNextDevicesDropdownSelectionChange: boolean
    
    static ScanCalibrationMillibars = [
        -1000,
        -750,
        -500,
        -480,
        -450,
        -400,
        -300,
        -200,
        -100,
        0,
        100,
        200,
        500,
        750,
        1000
    ]
    
    constructor(view) {
        
        // Calling super
        super(view)
        
        // Code for further setup if necessary
        PressureViewController.instance = this
        
    }
    
    
    loadIntrospectionVariables() {
        
        super.loadIntrospectionVariables()
        this.superclass = UIViewController
        
    }
    
    
    static readonly routeComponentName = "pressure_controller"
    
    static readonly ParameterIdentifierName = {}
    
    
    async loadSubviews() {
        
        this.view.backgroundColor = UIColor.whiteColor
        
        this.devicesDropdown = new SearchableDropdown(this.view.elementID + "DevicesDropdown")
        this.view.addSubview(this.devicesDropdown)
        this.devicesDropdown.isSingleSelection = YES
        this.devicesDropdown.intrinsicContentHeight = RETURNER(50)
        this.devicesDropdown.expandedContainerViewHeight = 500
        
        this.devicesDropdown.addTargetForControlEvent(
            SearchableDropdown.controlEvent.SelectionDidChange,
            async (sender, event) => {
                
                if (this._ignoreNextDevicesDropdownSelectionChange) {
                    this._ignoreNextDevicesDropdownSelectionChange = NO
                    return
                }
                
                CBDialogViewShower.showActionIndicatorDialog("Loading");
                
                // Tell server to connect to the devices
                (await SocketClient.ConnectToPressureDevice(
                    this.devicesDropdown.selectedData.map((value) => {
                        return { devicePath: value.attachedObject.port.path }
                    }).firstElement
                )).result
                
                // Show connection in plotter view
                await this.updatePressureControllers()
                
                // Administrative stuff
                this.view.setNeedsLayoutUpToRootView()
                CBDialogViewShower.hideActionIndicatorDialog()
                
            }
        )
        
        this.zeroADCOffsetCalibrationButton = new CBButton()
        this.zeroADCOffsetCalibrationButton.titleLabel.text = "Calibrate all ADC offsets"
        this.zeroADCOffsetCalibrationButton.addControlEventTarget.EnterDown.PointerUpInside = async () => {
            await this.calibrateZeroADCOffsets()
        }
        this.view.addSubview(this.zeroADCOffsetCalibrationButton)
        
        this.scanCalibrationButton = new CBButton()
        this.scanCalibrationButton.titleLabel.text = "Calibrate all channels by scanning"
        this.scanCalibrationButton.addControlEventTarget.EnterDown.PointerUpInside = () => {
            this.scanCalibrateAllChannels()
        }
        this.view.addSubview(this.scanCalibrationButton)
        
        CBDialogViewShower.hideActionIndicatorDialog()
        
    }
    
    
    private async updatePressureControllers() {
        
        const pressureDevice = (await SocketClient.RetrieveConnectedPressureDevice()).result
        
        function descriptorWithPort(portString: "A" | "B" | "C" | "D") {
            return {
                
                date: Date.now(),
                deviceObject: JSON.parse(JSON.stringify(pressureDevice)),
                identifier: "",
                inputString: "",
                pressureValue: 0,
                
                model: undefined,
                portString: portString,
                
                updateDate: Date.now(),
                viewType: "PressureView"
                
            }
        }
        
        if (pressureDevice) {
            
            this.descriptorObjects = this.descriptorObjects.concat([
                descriptorWithPort("A"),
                descriptorWithPort("B"),
                descriptorWithPort("C"),
                descriptorWithPort("D")
            ])
            
            const needsCalibration = this._pressureViews.anyMatch(value => !value.calibrationValues)
            if (needsCalibration) {
                
                const dialogViewShower = CBDialogViewShower.showQuestionDialog("Calibrate the device")
                dialogViewShower.yesButtonWasPressed = async () => {
                    
                    dialogViewShower.dialogView.dismiss()
                    
                    await this.calibrateZeroADCOffsets()
                    await this.scanCalibrateAllChannels()
                    
                }
                
            }
            
        }
        
        this._ignoreNextDevicesDropdownSelectionChange = YES
        
        this.devicesDropdown.selectedItemCodes = [pressureDevice?.port?.settings?.path]
        
        await this._pressureViews.everyElement.updatePressure()
        
    }
    
    
    async calibrateZeroADCOffsets() {
        for (let i = 0; i < this._pressureViews.length; i++) {
            const pressureView = this._pressureViews[i]
            await pressureView.measureADCOffset(i == 0)
        }
        CBDialogViewShower.hideActionIndicatorDialog()
    }
    
    async scanCalibrateAllChannels() {
        for (let i = 0; i < this._pressureViews.length; i++) {
            const pressureView = this._pressureViews[i]
            await pressureView.calibrateAtMillibars(
                PressureViewController.ScanCalibrationMillibars,
                10,
                i == 0
            )
        }
    }
    
    get pressures(): { [p: string]: number } {
        const pressures = {};
        (this._pressureViews.filter(
            view => view.descriptorObject.viewType == PressureView.name
        ) as any as PressureView[]).forEach(
            view => pressures[view.descriptorObject.identifier] = view.pressureTarget
        )
        return pressures
    }
    
    set pressures(pressures: { [p: string]: number }) {
        pressures.forEach((pressureTarget, key) => {
            const plotterView = this._pressureViews.find(
                view => wrapInNil(view).descriptorObject.identifier == key
            ) as any as PressureView
            wrapInNil(plotterView).pressureTarget = pressureTarget
        })
    }
    
    
    get descriptorObjects(): PressureDescriptorObject[] {
        const plotterDescriptorObjects = (this._pressureViews || []).map(view => view.descriptorObject)
        return plotterDescriptorObjects
    }
    
    set descriptorObjects(descriptorObjects: PressureDescriptorObject[]) {
        
        this._descriptorObjects = descriptorObjects
        
        const classes = { PressureView: PressureView }
        
        const views: PressureView[] = descriptorObjects.map((descriptorObject, index) => {
            
            descriptorObject.identifier = descriptorObject.identifier || MAKE_ID()
            
            const existingView = this._pressureViews.find(
                value => value.descriptorObject.identifier == descriptorObject.identifier
            )
            if (IS(existingView)) {
                existingView.descriptorObject = descriptorObject
                return existingView
            }
            
            const view = new classes[descriptorObject.viewType]()
            view.descriptorObject = descriptorObject
            view.configureWithObject({
                closeView: () => {
                    SocketClient.DisconnectFromDevice({
                        devicePath: FIRST_OR_NIL(descriptorObjects[index]).deviceObject.port.path
                    })
                    this._descriptorObjects.removeElementAtIndex(index)
                    this.descriptorObjects = this._descriptorObjects
                    this.updatePressureControllers()
                }
            })
            
            return view
            
        })
        
        this._pressureViews.everyElement.removeFromSuperview()
        this.view.addSubviews(views)
        
        this._pressureViews = views
        this.view.setNeedsLayoutUpToRootView()
        
    }
    
    
    multiplyAll(amount: number) {
        const pressures = {}
        this.pressures.forEach((value, key) => pressures[key] = value * amount)
        this.pressures = pressures
    }
    
    addToAll(amount: number) {
        const pressures = {}
        this.pressures.forEach((value, key) => pressures[key] = value + amount)
        this.pressures = pressures
    }
    
    setAll(amountToSet: number) {
        const pressures = {}
        this.pressures.forEach((value, key) => pressures[key] = amountToSet)
        this.pressures = pressures
    }
    
    stopPumps(pumpName: string) {
        SocketClient.StopPower().then(nil)
        console.log("STOPPING PUMPS - " + pumpName)
        CBDialogViewShower.alert("Stopping pumps - " + pumpName)
    }
    
    
    async viewDidAppear() {
        
        super.viewDidAppear()
        
        let allDevices: SerialPortDeviceObject[] = FIRST((await SocketClient.RetrieveAllDevices()).result, [])
        this.devicesDropdown.data = allDevices.map((value, index, array) => {
            let port: CBDropdownDataItem<SerialPortDeviceObject> = {
                _id: value.port.path,
                dropdownCode: "asdasdasdasdasdasdasdasd",
                isADropdownDataRow: true,
                isADropdownDataSection: false,
                itemCode: value.port.path,
                title: { en: value.port.path },
                attachedObject: value
            }
            return port
        })
        
        await this.updatePressureControllers()
        
    }
    
    
    layoutViewsManually() {
        
        super.layoutViewsManually()
        
        const padding = RootViewController.paddingLength
        const labelHeight = padding * 1.25
        const bounds = this.view.bounds
        
        this.view.setPaddings(0, 0, padding, 0)
        
        const ignoredViews: UIView[] = [this.zeroADCOffsetCalibrationButton, this.scanCalibrationButton]
        
        let viewFrame = bounds.rectangleWithInset(padding).rectangleWithHeight(0)
        this.view.subviews.filter((value, index, array) => !ignoredViews.contains(value)).forEach((view) => {
            view.frame = viewFrame.rectangleForNextRow(
                padding,
                view.intrinsicContentHeight(bounds.width - padding * 2)
            )
            viewFrame = view.frame
        })
        
        viewFrame.rectangleForNextRow(padding, labelHeight * 2)
            .distributeViewsAlongWidth([this.zeroADCOffsetCalibrationButton, this.scanCalibrationButton], 1, padding)
        
    }
    
    
    intrinsicViewContentHeight(constrainingWidth: number = 0): number {
        
        const padding = RootViewController.paddingLength
        const labelHeight = padding * 1.5
        
        var result = padding + padding * 0.25 +
            //padding * 2 + padding + labelHeight * 2 +
            //this.inputTextArea.intrinsicContentHeight(constrainingWidth) +
            (this.view.subviews.everyElement.intrinsicContentHeight(constrainingWidth) as any as number[]).summedValue +
            20 * this.view.subviews.length + padding
        
        
        return result
        
        
    }
    
    
}






































































