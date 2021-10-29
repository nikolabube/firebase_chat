import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class GlobalEventService {

    private fooSubject = new Subject<any>();

    publishSomeData(data: any) {
        this.fooSubject.next(data);
    }

    getObservable(): Subject<any> {
        return this.fooSubject;
    }

    calcCrow(lat1, lon1, lat2, lon2) {
        let R = 6371; // km
        let dLat = this.toRad(lat2 - lat1);
        let dLon = this.toRad(lon2 - lon1);
        lat1 = this.toRad(lat1);
        lat2 = this.toRad(lat2);

        let a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
        let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        let d = R * c;

        return d;
    }

    toRad(value) {
        return value * Math.PI / 180;
    }
}