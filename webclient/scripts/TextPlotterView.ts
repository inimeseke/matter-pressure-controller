/// <reference path="./UICore/UIViewController.ts" />
///<reference path="UICore/UITextView.ts"/>
///<reference path="Custom components/CBButton.ts"/>
///<reference path="UICore/UITextArea.ts"/>


//InlineEditor = CKSource.Editor


class TextPlotterView extends UIView {
    
    
    titleLabel: UITextView
    inputTextArea: UITextView;
    
    
    // chartView: UIView
    // chart: any
    // resultsLabel: UIView
    
    private _descriptorObject: FluikaDescriptorObject
    editor: any = nil
    previousWidth: number
    private closeButton: CBButton
    
    
    
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
        
        
        
        
        
        this.inputTextArea = new UITextView(this.elementID + "InputTextArea", "div")
        // this.inputTextArea.placeholderText = "Input your data here."
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
        
        
        // this.inputTextArea.tabIndex = 0
        // this.inputTextArea.style.cursor = "pointer"
        // this.inputTextArea.hoverText = "Edit text"
        
        this.inputTextArea.style.overflow = "hidden"
         this.inputTextArea.style.overflowWrap = "anywhere"
        this.inputTextArea.style.whiteSpace = "pre-wrap";
        
        this.closeButton.addControlEventTarget.PointerUpInside.EnterDown = (sender, event) => {
            
            this.closeView()
            
        }
        
        
        
        // this.inputTextArea.addControlEventTarget.Focus = (sender, event) => {
        //
        //     //sender.blur()
        //
        //     this.startEditing()
        //
        // }
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
        
        
        this.inputTextArea.addControlEventTarget.EnterDown.PointerDown = (sender, event) => {
    
            this.startEditing();
    
        }
        
        // this.inputTextArea.addControlEventTarget.Blur = (sender, event) => {
        //
        //
        //     this.editor.destroy();
        //
        //     this.editor = nil;
        //
        // }
        
        // this.inputTextArea.addControlEventTarget.TextChange = (sender, event) => {
        
        //     this.inputTextDidChange()
        
        //     //this.loadDataButton.enabled = IS(this.inputTextArea.text)
        
        // }
        
        
        
        
        
    }
    
    
    private async startEditing() {
        
        if (IS(this.editor)) {
            
            return
            
        }
        
        
        
        // @ts-ignore
        var editor = await InlineEditor.create(
            this.inputTextArea.viewHTMLElement,
            {
                
                
                //plugins: [CKFinder],
                
                // Enable the "Insert image" button in the toolbar.
                // toolbar: {
                //
                //     items:
                //     //     [
                //     //     "heading", "|",
                //     //     "fontfamily", "fontsize", "|",
                //     //     "alignment", "|",
                //     //     "fontColor", "fontBackgroundColor", "|",
                //     //     "bold", "italic", "strikethrough", "underline", "subscript", "superscript", "|",
                //     //     "link", "|",
                //     //     "outdent", "indent", "|",
                //     //     "bulletedList", "numberedList", "todoList", "|",
                //     //     "code", "codeBlock", "|",
                //     //     "insertTable", "|",
                //     //     "uploadImage", "blockQuote", "|",
                //     //     "undo", "redo"
                //     // ],
                //         [
                //
                //             "undo",
                //             "redo",
                //             "bold",
                //             "italic",
                //             'alignment',
                //             "blockQuote",
                //             "link",
                //             "heading",
                //
                //             "ckfinder",
                //             "uploadImage",
                //
                //             "indent",
                //             "outdent",
                //             "numberedList",
                //             "bulletedList",
                //             "mediaEmbed",
                //             "insertTable"
                //         ],
                //     shouldNotGroupWhenFull: false
                // },
                
                ckfinder: {
                    // Upload the images to the server using the CKFinder QuickUpload command.
                    uploadUrl: "/imageupload"
                }
            }
        )
        .catch(error => {
            console.error(error)
        })
        
        this.inputTextArea.style.cursor = ""
        this.inputTextArea.hoverText = ""
        
        this.inputTextArea.viewHTMLElement.addEventListener("DOMSubtreeModified", (event) => {
            
            this.setNeedsLayoutUpToRootView()
            
        }, false)
        
        //console.log(Array.from(editor.ui.componentFactory.names()))
        
        editor.model.document.on("change:data", (evt, data) => {
            
            
            
            //console.log(editor.getData())
            
            //this.inputTextArea.text = this.inputTextArea.text;
            
            this.setNeedsLayoutUpToRootView()
            
            this.inputTextDidChange()
            
            
            
            
        })
        
        editor.editing.view.document.on(
            "layoutChanged",
            event => {
                
                // console.log("Layout changed.")
                // console.log(event)
                
                this.setNeedsLayoutUpToRootView()
                
            },
            { priority: "lowest" }
        )
        
        editor.model.document.on("change", (evt, data) => {
            
            
            
            //console.log(editor.getData())
            
            this.setNeedsLayoutUpToRootView()
            
            //this.inputTextDidChange();
            
            
            
            
        })
        
        editor.model.document.on("focus", (evt, data) => {
            
            
            
            //console.log(editor.getData())
            
            this.setNeedsLayoutUpToRootView()
            
            //this.inputTextDidChange();
            
            
            
            
        })
        
        
        this.editor = editor
        
        this.setNeedsLayoutUpToRootView()
        
    }
    
    get exportObject() {
        
        let objectValue = {
            
            identifier: this._descriptorObject.identifier,
            
            viewType: TextPlotterView.name,
            inputString: this.editor.getData(),
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
        
        let objectValue = {
            
            identifier: this._descriptorObject.identifier || MAKE_ID(),
            
            viewType: TextPlotterView.name,
            inputString: FIRST(this.editor.getData(), this.inputTextArea.innerHTML),
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
    
    set descriptorObject(value: FluikaDescriptorObject) {
        
        this.inputTextArea.innerHTML = value.inputString
        
        this.editor.setData(value.inputString)
        
        this._descriptorObject = value
        
        //this.inputTextDidChange()
        
        this.titleLabel.text = new Date(this._descriptorObject.date || this._descriptorObject.updateDate).dateString +
            " (updated at " + new Date(this._descriptorObject.updateDate).dateString + ")"
        
        
        
    }
    
    inputTextDidChange() {
        
        wrapInNil(this._descriptorObject).updateDate = Date.now()
        
        this.titleLabel.text = new Date(this._descriptorObject.date || this._descriptorObject.updateDate).dateString +
            " (updated at " + new Date(this._descriptorObject.updateDate).dateString + ")"
        
        this.inputTextArea.invalidateSizeCache();
        
        // try {
        //
        //     this.inputTextArea.text = FIRST(
        //         this.inputTextArea.text,
        //         "x: asd\ny: asdasdasdasdasd\ndata: [\n\n// Using keys\n{ asd: 1, asdasdasdasdasd: 5 }\n\n// Or using" +
        //         " x" +
        //         " and y\n{ x: 2, y: 5.1 }\n\n]"
        //     )
        //
        //     // @ts-ignore
        //     let inputData = Hjson.parse(this.inputTextArea.text)
        //
        //     if (inputData instanceof Array) {
        //
        //         inputData = { data: inputData, x: "x", y: "y" }
        //
        //     }
        //
        //
        //
        // } catch (exception) {
        //
        //     console.log(exception)
        //
        //     //CBDialogViewShower.alert("Failed to display results. " + JSON.stringify(exception))
        //
        // }
        
    }
    
    closeView() {
        
        // Close the view
        
    }
    
    wasAddedToViewTree() {
        
        super.wasAddedToViewTree()
        
        //this.titleLabel.text = "Enter your data like shown."
        
        //this.inputTextDidChange()
        
    }
    
    private get editorElement(): HTMLElement {
        return document.querySelector("#" + this.viewHTMLElement.id + " > div.jodit-container")
    }
    
    
    
    
    
    layoutSubviews() {
        
        super.layoutSubviews()
        
        const padding = RootViewController.paddingLength
        const labelHeight = padding * 1.25
        
        // View bounds
        var bounds = this.bounds
        
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
                this.inputTextArea.intrinsicContentHeight(this.titleLabel.frame.width) + 5
            ).performFunctionWithSelf(self => {
                
                self.width = self.width - 20
                
                return self
                
            }),
            0,
            YES
        )
        
        //this.inputTextArea.setMinSizes(this.inputTextArea.frame.height)
        
        
        
        
        FIRST_OR_NIL(this.editorElement).style.marginTop = "" + this.inputTextArea.frame.y + "px"
        
        
        if (this.previousWidth != bounds.width) {
            
            wrapInNil(this.editor).buildToolbar()
            
        }
        
        
        
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
            FIRST(
                FIRST_OR_NIL(this.editorElement).scrollHeight,
                this.inputTextArea.intrinsicContentHeight(constrainingWidth)
            )
        
        // if (IS_NOT(this.chartView.hidden)) {
        //
        //     result = result + padding + (constrainingWidth - padding * 2) * 0.5 + padding + labelHeight * 2
        //
        // }
        
        return result
        
        
    }
    
    
}









































































