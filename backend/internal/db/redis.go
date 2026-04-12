package db

import (
	"github.com/redis/go-redis/v9"
)

func NewRedisClient(addr string) *redis.Client {
	client := redis.NewClient(&redis.Options{
		Addr: addr,
	})

	return client
}
