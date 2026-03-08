// storage/logs.js
import AsyncStorage from "@react-native-async-storage/async-storage";

const LOG_KEY = "logs";

// ➤ Add a new log (local update → pending)
export const addLog = async (title, voter, booth, status = "pending", location) => {
    const saved = await AsyncStorage.getItem(LOG_KEY);
    const logs = saved ? JSON.parse(saved) : [];

    const newLog = {
        id: Date.now(),   // unique log id
        title,
        voter: voter,  // <-- correct
        booth: booth,
        date: new Date().toISOString().slice(0, 16).replace("T", " "),
        status,           // pending | server
        location
    };

    const updated = [newLog, ...logs];
    await AsyncStorage.setItem(LOG_KEY, JSON.stringify(updated));
    return newLog.id;   // return id so we can update it after API success
};

// ➤ Update single log status after API success
export const updateLogStatus = async (logId, newStatus = "server") => {
    const saved = await AsyncStorage.getItem(LOG_KEY);
    const logs = saved ? JSON.parse(saved) : [];

    const updated = logs.map((log) =>
        log.id === logId ? { ...log, status: newStatus } : log
    );

    await AsyncStorage.setItem(LOG_KEY, JSON.stringify(updated));
};

// ➤ Get logs
export const getLogs = async () => {
    const saved = await AsyncStorage.getItem(LOG_KEY);
    return saved ? JSON.parse(saved) : [];
};

// ➤ Clear logs (optional)
export const clearLogs = async () => {
    await AsyncStorage.removeItem(LOG_KEY);
};
