
declare class Server {
	
    static logInfo(message: string): void
    static logWarning(message: string)
    static logError(message: string)
    
    static showWarning(message: string): void
    static showError(message: string)
    
    static resolveQueryAsJson(query: string, outputFormat: StringDictionary[]): string;
    static resolveAddress(address: string): string;
    
    static openConfirmation(title: string, message: string, yesButtonTitle: string, noButtonTitle: string): boolean;
    
    static escapeXml(string: string);
    
    
    
    
    
}


interface StringDictionary {
    
    [key: string]: string;
    
}

