interface Location {
  id: string;
  latitude: number;
  longitude: number;
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export function optimizeRoute(locations: Location[]): Location[] {
  if (locations.length <= 2) {
    return locations;
  }

  const unvisited = [...locations];
  const route: Location[] = [];

  let current = unvisited[0];
  route.push(current);
  unvisited.splice(0, 1);

  while (unvisited.length > 0) {
    let nearestIndex = 0;
    let minDistance = Infinity;

    unvisited.forEach((location, index) => {
      const distance = calculateDistance(
        current.latitude,
        current.longitude,
        location.latitude,
        location.longitude
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearestIndex = index;
      }
    });

    current = unvisited[nearestIndex];
    route.push(current);
    unvisited.splice(nearestIndex, 1);
  }

  return route;
}

export function clusterByDistance(
  locations: Location[],
  maxDistance: number = 20
): Location[][] {
  if (locations.length === 0) return [];

  const clusters: Location[][] = [];
  const unassigned = [...locations];

  while (unassigned.length > 0) {
    const cluster: Location[] = [unassigned[0]];
    unassigned.splice(0, 1);

    let added = true;
    while (added) {
      added = false;
      for (let i = unassigned.length - 1; i >= 0; i--) {
        const location = unassigned[i];
        const inRange = cluster.some((clusterLocation) => {
          const distance = calculateDistance(
            clusterLocation.latitude,
            clusterLocation.longitude,
            location.latitude,
            location.longitude
          );
          return distance <= maxDistance;
        });

        if (inRange) {
          cluster.push(location);
          unassigned.splice(i, 1);
          added = true;
        }
      }
    }

    clusters.push(cluster);
  }

  return clusters;
}

export function suggestOptimalDates(
  customerLocations: Location[],
  existingAppointments: Array<{ date: Date; location: Location }>,
  targetDate: Date,
  daysRange: number = 7
): Array<{ date: Date; score: number; reason: string }> {
  const suggestions: Array<{ date: Date; score: number; reason: string }> = [];

  for (let i = 0; i < daysRange; i++) {
    const candidateDate = new Date(targetDate);
    candidateDate.setDate(candidateDate.getDate() + i);

    const appointmentsOnDate = existingAppointments.filter(
      (apt) => apt.date.toDateString() === candidateDate.toDateString()
    );

    if (appointmentsOnDate.length === 0) {
      suggestions.push({
        date: candidateDate,
        score: 50,
        reason: 'No appointments on this day',
      });
      continue;
    }

    let totalDistance = 0;
    let minDistance = Infinity;

    customerLocations.forEach((customerLoc) => {
      appointmentsOnDate.forEach((apt) => {
        const distance = calculateDistance(
          customerLoc.latitude,
          customerLoc.longitude,
          apt.location.latitude,
          apt.location.longitude
        );
        totalDistance += distance;
        minDistance = Math.min(minDistance, distance);
      });
    });

    const avgDistance = totalDistance / (customerLocations.length * appointmentsOnDate.length);

    let score = 100;
    if (minDistance < 5) {
      score = 95;
    } else if (minDistance < 10) {
      score = 85;
    } else if (minDistance < 20) {
      score = 70;
    } else {
      score = 50;
    }

    suggestions.push({
      date: candidateDate,
      score,
      reason: `${appointmentsOnDate.length} appointment(s) nearby (avg ${avgDistance.toFixed(1)}km)`,
    });
  }

  return suggestions.sort((a, b) => b.score - a.score);
}

export function calculateRouteDistance(route: Location[]): number {
  let totalDistance = 0;
  for (let i = 0; i < route.length - 1; i++) {
    totalDistance += calculateDistance(
      route[i].latitude,
      route[i].longitude,
      route[i + 1].latitude,
      route[i + 1].longitude
    );
  }
  return totalDistance;
}
