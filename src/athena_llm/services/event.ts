import axios from "axios";
import Config from "./config";

interface EventEntity {
  currentSession: string;
  type: string;
  createdAt: number;
  data: any;
}

export class EventService {
  save(event: EventEntity) {
    const serverAddress = Config.getServerAddress();

    axios
      .post(`${serverAddress}/api/v1/events`, event)
      .then(function (response) {
        // console.log(response);
      })
      .catch(function (error) {
        console.log(error);
      });
  }
}
