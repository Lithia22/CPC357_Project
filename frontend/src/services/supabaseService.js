import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || supabaseUrl === "your_supabase_url_here") {
  console.error("Missing Supabase URL. Please update your .env.local file");
}

if (!supabaseKey || supabaseKey === "your_supabase_key_here") {
  console.error("Missing Supabase Key. Please update your .env.local file");
}

const supabase = createClient(supabaseUrl || "", supabaseKey || "");

const testConnection = async () => {
  try {
    const { error } = await supabase.from("sensor_readings").select("count");
    if (error) {
      console.warn("Supabase connection test failed:", error.message);
    } else {
      console.log("Supabase connected successfully");
    }
  } catch (err) {
    console.warn("Supabase connection test error:", err.message);
  }
};

if (process.env.NODE_ENV === "development") {
  testConnection();
}

export const getLatestReading = async () => {
  try {
    const { data, error } = await supabase
      .from("sensor_readings")
      .select("*")
      .order("timestamp", { ascending: false })
      .limit(1)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error getting latest reading:", error);
    return null;
  }
};

export const getRecentReadings = async (limit = 20) => {
  const { data, error } = await supabase
    .from("sensor_readings")
    .select("*")
    .order("timestamp", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
};

export const getRecentAlerts = async (limit = 50) => {
  const { data, error } = await supabase
    .from("alerts")
    .select("*")
    .order("timestamp", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
};

export const subscribeToReadings = (callback) => {
  const channel = supabase
    .channel("sensor_readings_changes")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "sensor_readings",
      },
      (payload) => {
        callback(payload.new);
      }
    )
    .subscribe();

  return channel;
};

export const subscribeToAlerts = (callback) => {
  const channel = supabase
    .channel("alerts_changes")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "alerts",
      },
      (payload) => {
        callback(payload.new);
      }
    )
    .subscribe();

  return channel;
};

export default supabase;
