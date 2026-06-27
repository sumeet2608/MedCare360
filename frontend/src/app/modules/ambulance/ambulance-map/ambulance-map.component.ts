import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy, SimpleChanges, ViewChild } from '@angular/core';
import * as L from 'leaflet';
import { Socket, io } from 'socket.io-client';
import { environment } from '../../../../environments/environment';

@Component({ selector: 'app-ambulance-map', templateUrl: './ambulance-map.component.html', styleUrls: ['./ambulance-map.component.scss'] })
export class AmbulanceMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() ambulances: any[] = [];
  @ViewChild('mapEl') mapEl!: ElementRef<HTMLDivElement>;

  private map: L.Map | null = null;
  private markers = new Map<string, L.Marker>();
  private socket: Socket | null = null;
  private viewReady = false;

  private statusColor: Record<string, string> = {
    available: '#059669', dispatched: '#dc2626', maintenance: '#d97706', offline: '#6b7280'
  };

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.initMap();
    this.renderMarkers();
    this.connectSocket();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['ambulances'] && this.viewReady) this.renderMarkers();
  }

  ngOnDestroy(): void {
    this.socket?.disconnect();
    this.map?.remove();
  }

  private initMap(): void {
    this.map = L.map(this.mapEl.nativeElement, { zoomControl: true }).setView([19.076, 72.877], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18
    }).addTo(this.map);
  }

  private icon(status: string): L.DivIcon {
    const color = this.statusColor[status] || '#6b7280';
    return L.divIcon({
      className: 'amb-marker',
      html: `<div style="background:${color};width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });
  }

  private renderMarkers(): void {
    if (!this.map) return;
    const seenIds = new Set<string>();
    const validPoints: [number, number][] = [];

    for (const amb of this.ambulances) {
      const lat = amb.location?.latitude;
      const lng = amb.location?.longitude;
      if (lat == null || lng == null) continue;
      seenIds.add(amb._id);
      validPoints.push([lat, lng]);

      const popupHtml = `<strong>${amb.vehicleNumber}</strong><br>${amb.type} &middot; ${amb.status}<br>${amb.location?.address || ''}`;

      if (this.markers.has(amb._id)) {
        this.markers.get(amb._id)!.setLatLng([lat, lng]).setIcon(this.icon(amb.status)).setPopupContent(popupHtml);
      } else {
        const marker = L.marker([lat, lng], { icon: this.icon(amb.status) }).bindPopup(popupHtml).addTo(this.map);
        this.markers.set(amb._id, marker);
      }
    }

    // Remove markers for ambulances no longer in the list
    for (const [id, marker] of this.markers.entries()) {
      if (!seenIds.has(id)) { marker.remove(); this.markers.delete(id); }
    }

    if (validPoints.length) {
      this.map.fitBounds(validPoints as any, { padding: [30, 30], maxZoom: 13 });
    }
  }

  private connectSocket(): void {
    const base = environment.apiUrl.replace(/\/api\/?$/, '');
    this.socket = io(base, { transports: ['websocket', 'polling'] });
    this.socket.on('connect', () => this.socket?.emit('join-admin'));
    this.socket.on('ambulance-location', (payload: any) => {
      const marker = this.markers.get(payload.ambulanceId);
      if (marker && payload.location) {
        marker.setLatLng([payload.location.latitude, payload.location.longitude]).setIcon(this.icon(payload.status));
      }
    });
  }
}
