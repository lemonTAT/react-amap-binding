const version2Flag = (version) => {
  return version && version.split('.')[0] === '2';
};

export default version2Flag;
