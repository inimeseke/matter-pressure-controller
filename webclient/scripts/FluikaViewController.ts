/// <reference path="./UICore/UIViewController.ts" />
///<reference path="UICore/UITextView.ts"/>
/// <reference path="./SharedTypes.d.ts" />
/// <reference path="../../node_modules/@types/serialport/index.d.ts" />


interface FluikaDescriptorObject {
    
    identifier: string
    
    date: number
    updateDate: number
    viewType: string
    inputString: string
    deviceObject?: SerialPortDeviceObject;
    pressureValue?: number;
    // @ts-ignore
    plotlyData?: { layout: Partial<Plotly.Layout>, config: Partial<Plotly.Config>, description: string }
    
    
}


class FluikaViewController extends UIViewController {
    
    
    private titleLabel: UITextView
    private inputTextArea: UITextArea
    private _descriptorObjects: FluikaDescriptorObject[]
    private _pressureViews: PlotterView[] = []
    private addPressureButton: CBButton
    updateTime: number
    shouldStoreData: boolean
    isStoreDataScheduled: boolean
    private savingLabel: UITextView
    private devicesDropdown: SearchableDropdown<SerialPortDeviceObject>
    
    static instance: FluikaViewController
    private _ignoreNextDevicesDropdownSelectionChange: boolean
    storedData: any
    
    private recordingTextField: UITextField
    private recordButton: CBButton
    private isRecording: boolean
    
    
    constructor(view) {
        
        // Calling super
        super(view)
        
        // Code for further setup if necessary
        
        FluikaViewController.instance = this
        
        
    }
    
    
    loadIntrospectionVariables() {
        
        super.loadIntrospectionVariables()
        this.superclass = UIViewController
        
    }
    
    
    static readonly routeComponentName = "pressure_fluika"
    
    static readonly ParameterIdentifierName = {}
    
    
    async loadSubviews() {
        
        this.view.backgroundColor = UIColor.whiteColor
        
        
        this.titleLabel = nil // new UITextView(this.view.elementID + "TitleLabel", UITextView.type.header3)
        // this.titleLabel.textAlignment = UITextView.textAlignment.left
        // this.titleLabel.nativeSelectionEnabled = NO
        // this.titleLabel.isSingleLine = NO
        // //this.view.addSubview(this.titleLabel)
        
        // this.plotterView = new PlotterView()
        // this.view.addSubview(this.plotterView)
        
        
        this.inputTextArea = nil // new UITextArea(this.view.elementID + "InputTextArea")
        // this.inputTextArea.placeholderText = "Input your data here."
        // this.inputTextArea.changesOften = YES
        // this.view.addSubview(this.inputTextArea)
        //
        // this.inputTextArea.text = "[\n\n{ x: 1, y: 5 }\n{ x: 2, y: 5.1 }\n\n] ASDASDASDASDASD"
        
        this.savingLabel = new UITextView()
        
        this.savingLabel.userInteractionEnabled = NO
        
        this.updateSavingLabelText()
        
        //this.savingLabel.textAlignment = UITextView.textAlignment.right
        
        this.savingLabel.calculateAndSetViewFrame = () => {
            
            this.savingLabel.style.position = "fixed"
            
            this.savingLabel.frame = this.savingLabel.superview.bounds.rectangleWithHeight(25)
                .rectangleWithInsets(10, 10, 0, 0)
                .rectangleWithY(
                    window.innerHeight - 25 // + window.scrollY
                )
            
        }
        
        this.recordingTextField = new UITextField()
        this.recordingTextField.placeholderText = "Name for the current recording."
        this.view.addSubview(this.recordingTextField)
        
        this.recordButton = new CBButton()
        this.recordButton.titleLabel.text = "Record progress"
        this.recordButton.intrinsicContentHeight = (constrainingWidth) => RootViewController.paddingLength * 2
        
        this.recordButton.colors.background.normal = UIColor.greenColor
        
        this.view.addSubview(this.recordButton)
        
        
        this.devicesDropdown = new SearchableDropdown(this.view.elementID + "DevicesDropdown")
        
        this.view.addSubview(this.devicesDropdown)
        
        this.devicesDropdown.isSingleSelection = NO
        
        this.devicesDropdown.intrinsicContentHeight = RETURNER(50)
        
        this.devicesDropdown.expandedContainerViewHeight = 500
        
        this.addPressureButton = new CBButton()
        this.addPressureButton.titleLabel.text = "Add Pressure controller"
        this.addPressureButton.intrinsicContentHeight = (constrainingWidth) => RootViewController.paddingLength * 2
        
        this.recordButton.addControlEventTarget.EnterDown.PointerUpInside = (sender, event) => {
            
            console.log(sender)
            
            const date = new Date()
            
            this.recordingTextField.text = FIRST_OR_NIL(
                this.recordingTextField.text,
                date.dateString + ":" + date.getSeconds()
            )
            
            if (!this.isRecording) {
                
                SocketClient.RecordData()
                this.recordButton.colors.background.normal = UIColor.redColor
                this.recordButton.titleLabel.text = "Stop recording progress"
                this.isRecording = YES
                
            }
            else {
                
                SocketClient.StopRecordingData({ name: this.recordingTextField.text })
                this.recordButton.colors.background.normal = UIColor.greenColor
                this.recordButton.titleLabel.text = "Record progress"
                this.isRecording = NO
                
                this.recordingTextField.text = nil
                
            }
            
            
        }
        
        this.addPressureButton.addControlEventTarget.EnterDown.PointerUpInside = async (sender, event) => {
            
            //console.log(sender)
            
            const objects = this.descriptorObjects.copy()
            
            objects.push({
                
                identifier: MAKE_ID(),
                
                viewType: "PressureView",
                inputString: "",
                date: Date.now(),
                updateDate: Date.now()
                
            })
            
            this.descriptorObjects = objects
            
            this._pressureViews.lastElement.inputTextArea.focus()
            
            
        }
        
        
        this.devicesDropdown.addTargetForControlEvent(
            SearchableDropdown.controlEvent.SelectionDidChange,
            async (sender, event) => {
                
                //console.log(sender)
                
                if (this._ignoreNextDevicesDropdownSelectionChange) {
                    
                    this._ignoreNextDevicesDropdownSelectionChange = NO
                    
                    return
                    
                }
                
                CBDialogViewShower.showActionIndicatorDialog("Loading")
                
                // Tell server to connect to the devices
                
                let serialPortDeviceObject = (await SocketClient.ConnectToFluikaDevices(
                    this.devicesDropdown.selectedData.map((value) => {
                        
                        return { devicePath: value.attachedObject.port.path }
                        
                    })
                )).result
                
                
                // Show connection in plotter view
                
                await this.updatePressureControllers()
                
                this.view.setNeedsLayoutUpToRootView()
                
                CBDialogViewShower.hideActionIndicatorDialog()
                
            }
        )
        
        
        CBDialogViewShower.showActionIndicatorDialog("Loading data.")
        
        this.storedData = JSON.parse(FIRST(
            (await SocketClient.StoredData()).result,
            "{ \"arrayOfDescriptors\": [], \"pressures\": {} }"
        ))
        
        //this.descriptorObjects = this.storedData.arrayOfDescriptors
        
        CBDialogViewShower.hideActionIndicatorDialog()
        
        
    }
    
    
    private async updatePressureControllers() {
        
        let devices = (await SocketClient.RetrieveConnectedDevices()).result
        
        this.descriptorObjects = devices.map((deviceObject: SerialPortDeviceObject, index: number) => {
            
            const result: FluikaDescriptorObject = {
                
                date: 0,
                inputString: "",
                updateDate: Date.now(),
                viewType: "PressureView",
                identifier: deviceObject.port.path + "_" + deviceObject.serialNumber,
                deviceObject: deviceObject
                
            }
            
            return result
            
        })
        
        this._ignoreNextDevicesDropdownSelectionChange = YES
        
        this.devicesDropdown.selectedItemCodes = devices.everyElement.port.path.UI_elementValues
        
    }
    
    viewDidReceiveBroadcastEvent(event: UIViewBroadcastEvent) {
        
        super.viewDidReceiveBroadcastEvent(event)
        
        if (event.name == UIView.broadcastEventName.PageDidScroll) {
            
            this.savingLabel.calculateAndSetViewFrame()
            
        }
        
        
    }
    
    
    get pressures(): { [p: string]: number } {
        
        const pressures = {};
        
        (this._pressureViews.filter(
            view => view.descriptorObject.viewType == FluikaPressureView.name
        ) as any as FluikaPressureView[]).forEach(
            view => pressures[view.descriptorObject.identifier] = view.pressureTarget
        )
        
        return pressures
        
    }
    
    set pressures(pressures: { [p: string]: number }) {
        
        pressures.forEach((pressureTarget, key) => {
            
            const plotterView = this._pressureViews.find(
                view => wrapInNil(view).descriptorObject.identifier == key
            ) as any as FluikaPressureView
            
            wrapInNil(plotterView).pressureTarget = pressureTarget
            
        })
        
    }
    
    
    savePressuresForKey(key: string) {
        
        this.storedData = this.storedData || { arrayOfDescriptors: [], pressures: {} }
        
        this.storedData.pressures[key] = this.pressures
        
        this.storeDataIfNeeded()
        
    }
    
    loadPressuresForKey(key: string) {
        
        this.pressures = this.storedData.pressures[key]
        
    }
    
    deletePressuresForKey(key: string) {
        
        this.storedData.pressures[key] = null
        
    }
    
    
    get descriptorObjects(): FluikaDescriptorObject[] {
        
        const plotterDescriptorObjects = (this._pressureViews || []).map(view => view.descriptorObject)
        
        return plotterDescriptorObjects
        
    }
    
    set descriptorObjects(descriptorObjects: FluikaDescriptorObject[]) {
        
        this._descriptorObjects = descriptorObjects
        
        const classes = { PlotterView: PlotterView, TextPlotterView: TextPlotterView, PressureView: FluikaPressureView }
        
        const views = descriptorObjects.map((descriptorObject, index) => {
            
            descriptorObject.identifier = descriptorObject.identifier || MAKE_ID()
            
            const existingView = this._pressureViews.find(
                value => value.descriptorObject.identifier == descriptorObject.identifier
            )
            
            if (IS(existingView)) {
                
                existingView.descriptorObject = descriptorObject
                
                return existingView
                
            }
            
            const view = new classes[descriptorObject.viewType]() as PlotterView
            
            view.descriptorObject = descriptorObject
            
            view.configureWithObject({
                
                // @ts-ignore
                inputTextDidChange: EXTEND(() => {
                    
                    this.scheduleStoreData()
                    
                }),
                closeView: () => {
                    
                    SocketClient.DisconnectFromDevice({
                        devicePath: FIRST_OR_NIL(descriptorObjects[index]).deviceObject.port.path
                    })
                    
                    this._descriptorObjects.removeElementAtIndex(index)
                    
                    this.descriptorObjects = this._descriptorObjects
                    
                    this.updatePressureControllers()
                    
                    this.scheduleStoreData()
                    
                }
                
            })
            
            return view
            
        })
        
        
        this._pressureViews.everyElement.removeFromSuperview()
        this.view.addSubviews(views)
        
        
        // const pressureViews: PressureView[] = (views as any[]).filter(view => view instanceof PressureView)
        // pressureViews.forEach((value, index, array) => value.setInputTextIfNeeded())
        
        
        this._pressureViews = views;
        
        this.addPressureButton.moveToTopOfSuperview()
        
        this.view.setNeedsLayoutUpToRootView()
        
        
    }
    
    
    private scheduleStoreData() {
        
        this.updateTime = Date.now() + 5000
        
        this.shouldStoreData = YES
        
        this.storeDataIfNeeded()
        
    }
    
    private async storeDataIfNeeded() {
        
        this.isStoreDataScheduled = NO
        
        if (this.shouldStoreData) {
            
            if (Date.now() > this.updateTime) {
                
                //this.view.rootView.backgroundColor = UIColor.blueColor
                
                this.savingLabel.text = "Saving"
                
                const names = this.descriptorObjects.map(object => {
                    
                    const result = { name: object.inputString }
                    
                    return result
                    
                })
                
                await SocketClient.StoreData({
                    inputData: JSON.stringify({ arrayOfDescriptors: this.descriptorObjects }),
                    names: names
                })
                
                //this.view.rootView.backgroundColor = UIColor.colorWithRGBA(225, 225, 225)
                
                this.shouldStoreData = NO
                
            }
            else if (IS_NOT(this.isStoreDataScheduled)) {
                
                this.performFunctionWithDelay(0.5, () => this.storeDataIfNeeded())
                
                this.isStoreDataScheduled = YES
                
                //this.view.rootView.backgroundColor = UIColor.yellowColor
                
            }
            
            
        }
        
        this.updateSavingLabelText()
        
        
    }
    
    private updateSavingLabelText() {
        
        if (this.isStoreDataScheduled && this.shouldStoreData) {
            
            this.savingLabel.text = "Saving in " + ((this.updateTime - Date.now()) * 0.001).integerValue
            
        }
        else {
            
            this.savingLabel.text = "Saved"
            
        }
        
        
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
        
        this._pressureViews.everyElement.closeView()
        
        console.log("STOPPING PUMPS - " + pumpName)
        
        CBDialogViewShower.alert("Stopping pumps - " + pumpName)
        
    }
    
    
    async viewDidAppear() {
        
        super.viewDidAppear()
        
        this.view.rootView.addSubview(this.savingLabel)
        
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
    
    async viewDidDisappear() {
        
        super.viewDidDisappear()
        
        this.savingLabel.removeFromSuperview()
        
        
    }
    
    
    async handleRoute(route: UIRoute) {
        
        super.handleRoute(route)
        
        const inquiryComponent = route.componentWithViewController(FluikaViewController)
        
        this.titleLabel.text = "Enter your data like shown."
        
        //this.inputTextDidChange();
        
        route.didcompleteComponent(inquiryComponent)
        
    }
    
    
    layoutViewsManually() {
        
        super.layoutViewsManually()
        
        const padding = RootViewController.paddingLength
        const labelHeight = padding * 1.25
        
        // View bounds
        var bounds = this.view.bounds
        
        this.view.setPaddings(0, 0, padding, 0)
        
        
        // this.titleLabel.frame = bounds.rectangleWithInsets(padding, padding, 0, padding)
        // .rectangleWithHeight(this.titleLabel.intrinsicContentHeight(bounds.width - padding * 2))
        //
        // this.inputTextArea.frame = this.titleLabel.frame.rectangleForNextRow(
        //     padding * 0.25,
        //     this.inputTextArea.intrinsicContentHeight(this.titleLabel.frame.width) + 5
        // )
        
        const ignoredViews: UIView[] = [this.recordButton, this.recordingTextField]
        
        let viewFrame = bounds.rectangleWithInset(padding).rectangleWithHeight(0)
        
        this.view.subviews.filter((value, index, array) => !ignoredViews.contains(value)).forEach((view) => {
            
            view.frame = viewFrame.rectangleForNextRow(
                padding,
                view.intrinsicContentHeight(bounds.width - padding * 2)
            )
            
            viewFrame = view.frame
            
        })
        
        viewFrame = viewFrame.rectangleForNextRow(padding, 50)
        
        viewFrame.distributeViewsEquallyAlongWidth([this.recordingTextField, this.recordButton], padding)
        
        
    }
    
    
    intrinsicViewContentHeight(constrainingWidth: number = 0): number {
        
        const padding = RootViewController.paddingLength
        const labelHeight = padding * 1.5
        
        var result = padding + this.titleLabel.intrinsicContentHeight(constrainingWidth) + padding * 0.25 +
            //padding * 2 + padding + labelHeight * 2 +
            //this.inputTextArea.intrinsicContentHeight(constrainingWidth) +
            (this.view.subviews.everyElement.intrinsicContentHeight(constrainingWidth) as any as number[]).summedValue +
            20 * this.view.subviews.length + 20
        
        
        return result
        
        
    }
    
    
}






































































