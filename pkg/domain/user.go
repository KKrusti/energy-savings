package domain

import "time"

// User represents an authenticated user account.
type User struct {
	ID             int64
	Username       string
	Email          string
	PasswordHash   string
	IsAdmin        bool
	HasSolarPanels bool
	CreatedAt      time.Time
}

// UserProfile is the public-facing subset of User returned by the profile endpoint.
type UserProfile struct {
	Username       string `json:"username"`
	Email          string `json:"email"`
	HasSolarPanels bool   `json:"has_solar_panels"`
}
