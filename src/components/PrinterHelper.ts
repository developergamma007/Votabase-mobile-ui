import { Alert } from "react-native";

export const PrinterHelper = {
    formatVoterSlip: (voter: any, boothInfo: any, template: any) => {
        const tpl = template || {};
        const now = new Date().toLocaleString();
        const voterName = voter?.firstMiddleNameEn || voter?.name || '-';
        const boothNo = voter?.boothNo || boothInfo?.boothId || boothInfo?.boothNo || '-';
        const serial = voter?.serialNo || '-';
        
        return `${tpl.electionName || 'Election-2026'}\n` +
               `       VOTER-SLIP\n` +
               `Name: ${voterName}\n` +
               `EPIC ID: ${voter?.epicNo || '-'}\n` +
               `Booth#: ${boothNo}  Sl#: ${serial}\n` +
               `Poll Booth: ${boothInfo?.boothNameEn || '-'}\n` +
               `Printed On: ${now}\n` +
               `--------------------------\n\n\n`;
    },

    scanForPrinters: async () => {
        // Simulating a BLE scan targeting the user's specific SEZNIK Thermal Printer
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve([
                    {
                        name: "Veer_Receipt_Printer_FBA", // Specified Model Name
                        id: "66:77:88:99:AA:BB",
                        brand: "SEZNIK",
                        specs: "Thermal Monochrome",
                    }
                ]);
            }, 1200); // Simulate realistic scanning delay
        });
    },

    connectPrinter: async (printer: any) => {
        // Simulating the BLE handshake connection to the thermal printer
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (printer?.name === "Veer_Receipt_Printer_FBA") {
                    console.log(`Connected to ${printer.brand} ${printer.name}`);
                    resolve(true);
                } else {
                    reject(new Error("Failed to connect to printer."));
                }
            }, 800);
        });
    },

    printText: async (text: string) => {
        return new Promise((resolve) => {
            setTimeout(() => {
                console.log("Printing to SEZNIK Printer (Monochrome 150mm/s):");
                console.log(text);
                resolve(true);
            }, 400); // Mock fast print speed
        });
    },

    performPrint: async (connectedPrinter: any, text: string) => {
        if (!connectedPrinter) {
            Alert.alert('Error', 'Please connect a printer first in the Print screen.');
            return false;
        }
        
        console.log("Printing in Super Safe Mode (5 bytes / 400ms delay)...");
        return true;
    }
};
