import axios
 from "axios";

interface EventEntity {
    currentSession: string,
    type: string;
    createdAt: number;
    data: any;
}

export class EventService {
    save(event: EventEntity) {
        axios.post('http://localhost:8000/api/v1/events', event)
    .then(function (response) {
      // console.log(response);
    })
    .catch(function (error) {
      console.log(error);
    });
    }
}
