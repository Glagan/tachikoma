import { Lake } from "./Lake";
import Sites from "@Site";

export default Array.from(new Set([...Lake.services.map((service) => service.key), ...Sites]));
