class EnterNumericalValueView extends UIView {
    
    minusButton: CBFlatButton
    textField: UITextField
    plusButton: CBFlatButton
    
    minValue: number = nil
    maxValue: number = nil
    _previousNumericalValue: number
    
    
    
    constructor(elementID?: string) {
        
        super(elementID)
        
        
        this._class = EnterNumericalValueView
        this.superclass = UIView
        
        
        
        
    }
    
    
    
    
    
    initView(elementID: string, viewHTMLElement: HTMLElement, initViewData) {
        
        super.initView(elementID, viewHTMLElement, initViewData)
        
        
        
        this.minusButton = new CBFlatButton(elementID + "MinusButton")
        this.minusButton.titleLabel.text = "-"
        
        this.textField = new UITextField(elementID + "TextField")
        this.textField.text = "0"
        this.textField.textAlignment = UITextView.textAlignment.center
        
        this.plusButton = new CBFlatButton(elementID + "PlusButton")
        this.plusButton.titleLabel.text = "+"
        
        
        
        this.addSubviews([this.minusButton, this.textField, this.plusButton])
        
        
        
        
        this.minusButton.addTargetForControlEvents([
            UIView.controlEvent.EnterDown, UIView.controlEvent.PointerUpInside
        ], function (this: EnterNumericalValueView, sender: UIButton, event: Event) {
            
            this.numericalValue = this.numericalValue - 1
            
        }.bind(this))
        
        this.plusButton.addTargetForControlEvents([
            UIView.controlEvent.EnterDown, UIView.controlEvent.PointerUpInside
        ], function (this: EnterNumericalValueView, sender: UIButton, event: Event) {
            
            this.numericalValue = this.numericalValue + 1
            
        }.bind(this))
        
        
        
        this.textField.addTargetForControlEvent(
            UITextField.controlEvent.TextChange,
            function (this: EnterNumericalValueView, sender: UITextField, event: Event) {
                
                const value = this.numericalValue
                
                if (!value.isANumber || isNaN(value)) {
                    
                    if (this._previousNumericalValue) {
                        
                        this.numericalValue = this._previousNumericalValue
                        
                    }
                    else {
                        
                        this.numericalValue = 0
                        
                    }
                    
                }
                
            }.bind(this)
        )
        
        
        
        
        
    }
    
    
    
    
    
    updateContentForCurrentEnabledState() {
        
        this.alpha = IF(this.enabled)(RETURNER(1)).ELSE(RETURNER(0.5))
        
        this.userInteractionEnabled = this.enabled
        
    }
    
    
    
    
    
    get numericalValue() {
        
        return this.text.numericalValue
        
    }
    
    set numericalValue(value: number) {
        
        if (IS_NOT_NIL(this.minValue) && value < this.minValue) {
            value = this.minValue
        }
        
        if (IS_NOT_NIL(this.maxValue) && value > this.maxValue) {
            value = this.maxValue
        }
        
        if (this.numericalValue == value) {
            return
        }
        
        this.textField.text = "" + value
        this._previousNumericalValue = value
        
        this.textField.sendControlEventForKey(UITextField.controlEvent.TextChange, nil);
        
    }
    
    
    get integerValue() {
        
        return parseInt(this.text)
        
    }
    
    set integerValue(value: number) {
        
        this.numericalValue = value
        
    }
    
    
    get floatValue() {
        
        return parseFloat(this.text)
        
    }
    
    set floatValue(value: number) {
        
        this.numericalValue = value
        
    }
    
    get text() {
        
        return this.textField.text.replace(new RegExp(",", "g"), ".")
        
    }
    
    
    
    
    
    layoutSubviews() {
        
        super.layoutSubviews()
        
        const padding = RootViewController.paddingLength
        const labelHeight = padding
        
        
        this.bounds.distributeViewsEquallyAlongWidth([this.minusButton, this.textField, this.plusButton], padding)
        
        
        
        
        
    }
    
    
    
    
    
}























