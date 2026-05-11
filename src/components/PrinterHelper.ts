import { Alert } from "react-native";

export const PrinterHelper = {
    formatVoterSlip: (voter, boothInfo, template) => {
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

    performPrint: async (connectedPrinter, text) => {
        if (!connectedPrinter) {
            Alert.alert('Error', 'Please connect a printer first in the Print screen.');
            return false;
        }
        
        console.log("Printing in Super Safe Mode (5 bytes / 400ms delay)...");
        // Structural logic for "Super Safe Mode" printing
        // This would use a native BLE write call in a real implementation
        // For now, we mock the success
        return true;
    }
};
