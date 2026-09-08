-- Corre uma vez, no primeiro arranque do volume `postgres-data-dev`
-- (ver docker-compose.dev.yml). Uma base de dados própria para os
-- testes, separada da que a API usa em desenvolvimento normal, para
-- correr `pytest` nunca apagar dados que estejas a olhar no MinIO/
-- pgAdmin ao mesmo tempo.
CREATE DATABASE heldergoncalves_test OWNER helder;
