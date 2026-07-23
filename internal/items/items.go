package items

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
)

type Items struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

var (
	items   []Items
	mu      sync.RWMutex
	counter int
)

func init() {
	items = make([]Items, 0)
}

func CreateHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var item Items
	if err := json.NewDecoder(r.Body).Decode(&item); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	mu.Lock()
	counter++
	item.ID = fmt.Sprintf("%d", counter)
	items = append(items, item)
	mu.Unlock()
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(item)
}

func ListHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	mu.RLock()
	defer mu.RUnlock()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(items)
}
