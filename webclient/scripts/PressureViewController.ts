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
    
    portString: "A" | "B" | "C" | "D"
    
    
}


class PressureViewController extends UIViewController {
    
    private _descriptorObjects: PressureDescriptorObject[]
    private _pressureViews: PressureView[] = []
    private devicesDropdown: SearchableDropdown<SerialPortDeviceObject>
    
    static instance: PressureViewController
    private _ignoreNextDevicesDropdownSelectionChange: boolean
    
    
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
                
                //console.log(sender)
                
                if (this._ignoreNextDevicesDropdownSelectionChange) {
                    
                    this._ignoreNextDevicesDropdownSelectionChange = NO
                    
                    return
                    
                }
                
                CBDialogViewShower.showActionIndicatorDialog("Loading")
                
                // Tell server to connect to the devices
                
                let serialPortDeviceObject = (await SocketClient.ConnectToPressureDevice(
                    this.devicesDropdown.selectedData.map((value) => {
                        
                        return { devicePath: value.attachedObject.port.path }
                        
                    }).firstElement
                )).result
                
                
                // Show connection in plotter view
                
                await this.updatePressureControllers()
                
                this.view.setNeedsLayoutUpToRootView()
                
                CBDialogViewShower.hideActionIndicatorDialog()
                
            }
        )
        
        
        CBDialogViewShower.showActionIndicatorDialog("Loading data.")
        
        
        //this.descriptorObjects = this.storedData.arrayOfDescriptors
        
        CBDialogViewShower.hideActionIndicatorDialog()
        
        
    }
    
    
    private async updatePressureControllers() {
        
        const pressureDevice = (await SocketClient.RetrieveConnectedPressureDevice()).result
        
        if (pressureDevice) {
            
            const descriptors = this.descriptorObjects
            
            descriptors.push({
                
                date: Date.now(),
                deviceObject: JSON.parse(JSON.stringify(pressureDevice)),
                identifier: "",
                inputString: "",
                pressureValue: 0,
                
                portString: "A",
                
                updateDate: Date.now(),
                viewType: "PressureView"
                
            })
            
            descriptors.push({
                
                date: Date.now(),
                deviceObject: JSON.parse(JSON.stringify(pressureDevice)),
                identifier: "",
                inputString: "",
                pressureValue: 0,
                
                portString: "B",
                
                updateDate: Date.now(),
                viewType: "PressureView"
                
            })
            
            descriptors.push({
                
                date: Date.now(),
                deviceObject: JSON.parse(JSON.stringify(pressureDevice)),
                identifier: "",
                inputString: "",
                pressureValue: 0,
                
                portString: "C",
                
                updateDate: Date.now(),
                viewType: "PressureView"
                
            })
            
            descriptors.push({
                
                date: Date.now(),
                deviceObject: JSON.parse(JSON.stringify(pressureDevice)),
                identifier: "",
                inputString: "",
                pressureValue: 0,
                
                portString: "D",
                
                updateDate: Date.now(),
                viewType: "PressureView"
                
            })
            
            this.descriptorObjects = descriptors
            
        }
        
        this._ignoreNextDevicesDropdownSelectionChange = YES
        
        this.devicesDropdown.selectedItemCodes = [pressureDevice?.port?.path]
        
    }
    
    viewDidReceiveBroadcastEvent(event: UIViewBroadcastEvent) {
        
        super.viewDidReceiveBroadcastEvent(event)
        
        
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
        
        const views = descriptorObjects.map((descriptorObject, index) => {
            
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
                
                // // @ts-ignore
                // inputTextDidChange: EXTEND(() => {
                //
                //
                //
                // }),
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
        
        
        // const pressureViews: PressureView[] = (views as any[]).filter(view => view instanceof PressureView)
        // pressureViews.forEach((value, index, array) => value.setInputTextIfNeeded())
        
        
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
        
        this._pressureViews.everyElement.closeView()
        
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
    
    async viewDidDisappear() {
        
        super.viewDidDisappear()
        
        
    }
    
    
    async handleRoute(route: UIRoute) {
        
        super.handleRoute(route)
        
        const inquiryComponent = route.componentWithViewController(PressureViewController)
        
        route.didcompleteComponent(inquiryComponent)
        
    }
    
    
    layoutViewsManually() {
        
        super.layoutViewsManually()
        
        const padding = RootViewController.paddingLength
        const labelHeight = padding * 1.25
        
        // View bounds
        var bounds = this.view.bounds
        
        this.view.setPaddings(0, 0, padding, 0)
        
        
        const ignoredViews: UIView[] = []
        
        let viewFrame = bounds.rectangleWithInset(padding).rectangleWithHeight(0)
        
        this.view.subviews.filter((value, index, array) => !ignoredViews.contains(value)).forEach((view) => {
            
            view.frame = viewFrame.rectangleForNextRow(
                padding,
                view.intrinsicContentHeight(bounds.width - padding * 2)
            )
            
            viewFrame = view.frame
            
        })
        
        
    }
    
    
    intrinsicViewContentHeight(constrainingWidth: number = 0): number {
        
        const padding = RootViewController.paddingLength
        const labelHeight = padding * 1.5
        
        var result = padding + padding * 0.25 +
            //padding * 2 + padding + labelHeight * 2 +
            //this.inputTextArea.intrinsicContentHeight(constrainingWidth) +
            (this.view.subviews.everyElement.intrinsicContentHeight(constrainingWidth) as any as number[]).summedValue +
            20 * this.view.subviews.length + 20
        
        
        return result
        
        
    }
    
    
}






































































