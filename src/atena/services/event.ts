import axios
 from "axios";

interface EventEntity {
    type: string;
    createdAt: number;
    data: any;
}

export class EventService {
    save(event: EventEntity) {
        axios.post('http://127.0.0.1:5000/api/v1/events', event)
    .then(function (response) {
      console.log(response);
    })
    .catch(function (error) {
      console.log(error);
    });
    }
}
