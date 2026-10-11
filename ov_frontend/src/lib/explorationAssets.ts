function getExplorationImagePath(fileName: string) {
  return `${import.meta.env.BASE_URL}images/${fileName}`
}

export { getExplorationImagePath }
