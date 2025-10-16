import axios from "axios";
import { env } from "../config/env";

export const http = axios.create({
  baseURL: env.apiBase,
  withCredentials: true,
});
