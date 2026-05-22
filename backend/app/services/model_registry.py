MODEL_LABELS = ["glioma", "meningioma", "notumor", "pituitary"]

MODEL_AGENT_SPECS = {
    "cnn_agent": {
        "display_name": "Proposed CNN Agent",
        "config_key": "cnn_model_path",
        "default_size": 32,
    },
    "resnet50_agent": {
        "display_name": "ResNet-50 Agent",
        "config_key": "resnet50_model_path",
        "default_size": 224,
    },
    "vgg16_agent": {
        "display_name": "VGG16 Agent",
        "config_key": "vgg16_model_path",
        "default_size": 224,
    },
    "inception_v3_agent": {
        "display_name": "Inception V3 Agent",
        "config_key": "inception_v3_model_path",
        "default_size": 299,
    },
}
